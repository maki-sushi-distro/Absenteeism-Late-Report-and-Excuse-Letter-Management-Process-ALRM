import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, UserPlus } from "lucide-react";
import { changeManagedUser, getUserManagementPrograms, getUserManagementUsersPage, userManagementPageCacheKey } from "@/api/adminUserManagement";
import { cancelResourceRequest, getResourceCacheEntry, invalidateResourceCache, requestCachedResource } from "@/api/resourceCache";
import { useAuth } from "@/context/AuthContext";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import ResourceRefresh from "@/components/common/ResourceRefresh";
import LoadingSkeleton from "@/components/loading/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import UserManagementFilters from "./UserManagementFilters";
import ManagedAccountDialog from "./ManagedAccountDialog";
import AddUserDialog from "./AddUserDialog";
import { studentYearSection, userDepartment, userDisplayId, userErrorMessage, userStatus } from "./userManagementData.js";
import { mergeProgramsSuccess, mergeUsersPageSuccess, recoverUserManagementPage } from "./userManagementPageState.js";

const initialFilters = { status: "", role: "", program: "", year: "", search: "" };
const programsCacheKey = "admin:user-management:programs";

function initialData(usersCacheKey) {
  const users = getResourceCacheEntry(usersCacheKey);
  const programs = getResourceCacheEntry(programsCacheKey);
  return {
    users: users?.data?.data || [], usersKey: users ? usersCacheKey : null, meta: users?.data?.meta || null, programs: programs?.data || [],
    loadingUsers: !users, loadingPrograms: !programs, error: "", programError: "",
    updatedAt: Math.max(users?.updatedAt || 0, programs?.updatedAt || 0) || null,
  };
}

export default function AdminUserManagement() {
  const { user: currentUser } = useAuth();
  const [params] = useSearchParams();
  const [filters, setFilters] = useState(() => ({ ...initialFilters, status: params.get("status") || "", role: params.get("role") || "", program: params.get("program") || "", year: params.get("year") || "", search: params.get("search") || "" }));
  const [searchInput, setSearchInput] = useState(filters.search);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(() => params.get("user") || null);
  const requestFilters = useMemo(() => ({ ...filters, userId: selectedId || "" }), [filters, selectedId]);
  const usersCacheKey = userManagementPageCacheKey(page, requestFilters);
  const [data, setData] = useState(() => initialData(usersCacheKey));
  const [reload, setReload] = useState(0);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const actionLock = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const force = reload > 0;
    requestCachedResource(usersCacheKey, (signal) => getUserManagementUsersPage({ signal, page, perPage: 10, filters: requestFilters }), { force })
      .then((result) => {
        const recovered = recoverUserManagementPage(page, result.meta);
        if (!active) return;
        if (recovered != null) {
          setPage(recovered);
          setSelectedId(null);
          return;
        }
        setData((current) => ({ ...mergeUsersPageSuccess(current, result, usersCacheKey), updatedAt: Math.max(getResourceCacheEntry(usersCacheKey)?.updatedAt || 0, current.updatedAt || 0) || null }));
      })
      .catch((error) => {
        if (active && error?.name !== "AbortError") setData((current) => ({ ...current, users: [], usersKey: usersCacheKey, meta: null, loadingUsers: false, error: userErrorMessage(error) }));
      });
    return () => { active = false; cancelResourceRequest(usersCacheKey); };
  }, [page, reload, requestFilters, usersCacheKey]);

  useEffect(() => {
    let active = true;
    requestCachedResource(programsCacheKey, (signal) => getUserManagementPrograms({ signal }), { force: reload > 0 })
      .then((programs) => { if (active) setData((current) => mergeProgramsSuccess(current, programs)); })
      .catch((error) => { if (active) setData((current) => ({ ...current, loadingPrograms: false, programError: userErrorMessage(error) })); });
    return () => { active = false; };
  }, [reload]);

  useEffect(() => {
    if (searchInput === filters.search) return undefined;
    const timer = window.setTimeout(() => {
      setData((current) => ({ ...current, loadingUsers: true, error: "" }));
      setFilters((current) => ({ ...current, search: searchInput.trim() }));
      setPage(1);
      setSelectedId(null);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filters.search, searchInput]);

  const pagination = useMemo(() => ({
    rows: data.users,
    page: data.meta?.page || page,
    pageCount: Math.max(1, data.meta?.last_page || 1),
    start: ((data.meta?.page || page) - 1) * (data.meta?.per_page || 10),
    total: data.meta?.total ?? data.users.length,
  }), [data.meta, data.users, page]);
  const loadingUsers = data.loadingUsers || data.usersKey !== usersCacheKey;
  const studentView = filters.role === "student";
  const columns = studentView
    ? [["Name", "w-[24%]"], ["ID", "w-[18%]"], ["Program", "w-[28%]"], ["Year/Section", "w-[18%]"], ["Action", "w-[12%]"]]
    : [["Name", "w-[22%]"], ["ID", "w-[14%]"], ["Department", "w-[24%]"], ["Email", "w-[28%]"], ["Action", "w-[12%]"]];
  const selected = data.users.find((item) => String(item.id) === String(selectedId));

  function changeFilter(name, value) {
    setData((current) => ({ ...current, loadingUsers: true, error: "" }));
    setFilters((current) => ({ ...current, [name]: value, ...(name === "role" && value !== "student" ? { year: "" } : {}) }));
    setPage(1);
    setSelectedId(null);
    setActionError("");
  }

  function refresh() {
    invalidateResourceCache("admin:user-management:");
    setData((current) => ({ ...current, users: [], loadingUsers: true, loadingPrograms: true, error: "", programError: "" }));
    setSelectedId(null);
    setActionError("");
    setNotice("");
    setReload((current) => current + 1);
  }

  function closeAccount() {
    if (!actionLock.current) {
      setData((current) => ({ ...current, loadingUsers: true }));
      setSelectedId(null);
    }
  }

  async function changeAccount(field, value) {
    if (!selected || actionLock.current || loadingUsers) return;
    actionLock.current = true;
    setWorking(true);
    setActionError("");
    setNotice("");
    try {
      const updated = await changeManagedUser(selected, currentUser?.id, field, value);
      if (!mounted.current) return;
      const result = value === "deactivated" ? "account deactivated" : userStatus(selected) === "pending" ? "account approved" : "account reactivated";
      setNotice(`${updated.name || selected.name || "User"}: ${result}.`);
      setSelectedId(null);
      invalidateResourceCache("admin:user-management:users:");
      setReload((current) => current + 1);
    } catch (error) {
      if (mounted.current) setActionError(userErrorMessage(error));
    } finally {
      actionLock.current = false;
      if (mounted.current) setWorking(false);
    }
  }

  return (
    <div className="min-w-0 w-full space-y-5 text-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button type="button" aria-haspopup="dialog" aria-expanded={addingUser} aria-controls={addingUser ? "add-user-dialog" : undefined} onClick={() => setAddingUser(true)} className="h-10 bg-[#172f6b] px-4 text-white hover:bg-[#203f8a]"><UserPlus className="size-4" />Add User</Button>
      </div>

      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 max-w-[400px] flex-1 basis-48">
          <Input type="search" aria-label="Search users" placeholder="Search Name, ID, Email..." value={searchInput} disabled={working} onChange={(event) => setSearchInput(event.target.value)} className="h-10 rounded-[8px] border-slate-300 pr-9! shadow-sm" />
          <Search aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400" />
        </div>
        <ResourceRefresh updatedAt={data.updatedAt} loading={loadingUsers || data.loadingPrograms} onRefresh={refresh} />
        </div>
        <UserManagementFilters filters={filters} programs={data.programs} loading={data.loadingPrograms} programError={data.programError} disabled={working} onChange={changeFilter} />
      </div>

      {data.programError && <div role="alert"><ErrorState title="Programs could not be loaded" message={data.programError} /></div>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
      {data.usersKey === usersCacheKey && data.error ? <div role="alert" className="space-y-3"><ErrorState title="Unable to load users" message={data.error} /><Button variant="outline" onClick={refresh}>Try again</Button></div> : loadingUsers ? (
        <LoadingSkeleton variant="table" rows={10} columns={columns.length} label="Loading users" />
      ) : data.users.length === 0 ? (
        <EmptyState title="No users found" message="No accounts match this view. Try changing the filters or search." />
      ) : (
        <>
          <p className="sr-only">Use View to review and manage an account.</p>
          <Table className="min-w-[900px] table-fixed">
            <TableHeader><TableRow className="border-[#172f6b]/40 hover:bg-transparent">
              {columns.map(([heading, width]) => <TableHead key={heading} scope="col" className={`h-12 px-3 font-bold text-[#172f6b] ${width}`}>{heading}</TableHead>)}
            </TableRow></TableHeader>
            <TableBody>
              {pagination.rows.map((user, index) => (
                  <TableRow key={user.id} className="border-[#172f6b]/40">
                    <TableCell className="px-3 py-5 whitespace-normal">
                      <span className="font-medium">
                        {pagination.start + index + 1}. {user.name || "Unnamed user"}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-5 whitespace-normal">{userDisplayId(user)}</TableCell>
                    <TableCell className="break-words px-3 py-5 whitespace-normal">{userDepartment(user, data.programs)}</TableCell>
                    <TableCell className="break-words px-3 py-5 whitespace-normal">{studentView ? studentYearSection(user) : user.email || "Unavailable"}</TableCell>
                    <TableCell className="px-3 py-5"><Button type="button" aria-label={`View and manage account for ${user.name || "unnamed user"}`} aria-haspopup="dialog" aria-expanded={selected?.id === user.id} aria-controls={selected?.id === user.id ? "managed-account" : undefined} disabled={working} onClick={() => { setData((current) => ({ ...current, loadingUsers: true })); setSelectedId(user.id); setActionError(""); setNotice(""); }} className="h-9 min-w-20 bg-[#172f6b] px-4 text-white hover:bg-[#203f8a]">View</Button></TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
            <p role="status">Showing {pagination.start + 1}–{pagination.start + pagination.rows.length} of {pagination.total} users</p>
            <nav aria-label="User list pagination" className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={pagination.page === 1 || working} onClick={() => { setData((current) => ({ ...current, loadingUsers: true })); setPage(pagination.page - 1); setSelectedId(null); }}><ChevronLeft /></Button>
              <span>Page {pagination.page} of {pagination.pageCount}</span>
              <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={pagination.page === pagination.pageCount || working} onClick={() => { setData((current) => ({ ...current, loadingUsers: true })); setPage(pagination.page + 1); setSelectedId(null); }}><ChevronRight /></Button>
            </nav>
          </div>
        </>
      )}
      {!loadingUsers && !data.error && selected && (
        <ManagedAccountDialog key={selected.id} user={selected} currentUserId={currentUser?.id} programs={data.programs}
          working={working} actionError={actionError}
          onChange={changeAccount} onClose={closeAccount} />
      )}
      {addingUser && <AddUserDialog onClose={() => setAddingUser(false)} onCreated={refresh} />}
    </div>
  );
}
