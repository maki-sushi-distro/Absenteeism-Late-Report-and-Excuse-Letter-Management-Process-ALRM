import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { changeManagedUser, getUserManagementPrograms, getUserManagementUsers } from "@/api/adminUserManagement";
import { useAuth } from "@/context/AuthContext";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import LoadingSkeleton from "@/components/loading/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { filterUsers, paginateUsers, ROLE_LABELS, STAFF_ROLES, studentYearLabel, userDepartment, userDisplayId, userErrorMessage, userPermissions, userStatus } from "./userManagementData.js";

const initialFilters = { tab: "approved", status: "approved", role: "", program: "", search: "" };
const selectClass = "h-10 min-w-44 rounded-[8px] border border-[#172f6b]/60 bg-white px-4 pr-9 text-sm text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-[#172f6b]/40 disabled:opacity-50";

export default function AdminUserManagement() {
  const { user: currentUser } = useAuth();
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ users: [], programs: [], loading: true, error: "", programError: "" });
  const [reload, setReload] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const actionLock = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled([
      getUserManagementUsers({ signal: controller.signal }),
      getUserManagementPrograms({ signal: controller.signal }),
    ]).then(([users, programs]) => {
      if (controller.signal.aborted) return;
      setData({
        users: users.status === "fulfilled" ? users.value : [],
        programs: programs.status === "fulfilled" ? programs.value : [],
        loading: false,
        error: users.status === "rejected" ? userErrorMessage(users.reason) : "",
        programError: programs.status === "rejected" ? userErrorMessage(programs.reason) : "",
      });
    });
    return () => controller.abort();
  }, [reload]);

  const filtered = useMemo(() => filterUsers(data.users, filters, data.programs), [data.users, data.programs, filters]);
  const pagination = paginateUsers(filtered, page);
  const selected = data.users.find((item) => item.id === selectedId);
  const permissions = selected ? userPermissions(selected, currentUser?.id) : {};

  function changeFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
    setSelectedId(null);
    setActionError("");
  }

  function refresh() {
    setData((current) => ({ ...current, users: [], loading: true, error: "", programError: "" }));
    setSelectedId(null);
    setActionError("");
    setNotice("");
    setReload((current) => current + 1);
  }

  async function changeAccount(field, value) {
    if (!selected || actionLock.current || data.loading) return;
    actionLock.current = true;
    setWorking(true);
    setActionError("");
    setNotice("");
    try {
      const updated = await changeManagedUser(selected, currentUser?.id, field, value);
      if (!mounted.current) return;
      setData((current) => ({ ...current, users: current.users.map((item) => item.id === updated.id ? { ...item, ...updated } : item) }));
      const result = field === "role" ? `role updated to ${ROLE_LABELS[value]}` : value === "deactivated" ? "account deactivated" : userStatus(selected) === "pending" ? "account approved" : "account reactivated";
      const programReminder = field === "role" && value === "program_head" && updated.headed_program_exists === false
        ? " Assign this program head to a program in Programs."
        : "";
      setNotice(`${updated.name || selected.name || "User"}: ${result}.${programReminder}`);
      setSelectedId(null);
    } catch (error) {
      if (mounted.current) setActionError(userErrorMessage(error));
    } finally {
      actionLock.current = false;
      if (mounted.current) setWorking(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1050px] space-y-5 text-slate-950">
      <h1 className="sr-only">User Management</h1>
      <nav aria-label="User approval views" className="flex flex-wrap gap-3">
        {[["approved", "Approved Users"], ["waiting", "Waiting for Approval"]].map(([value, label]) => (
          <button key={value} type="button" aria-current={filters.tab === value ? "page" : undefined} disabled={working} onClick={() => changeFilter("tab", value)} className={`border-b px-2.5 py-2.5 text-[19px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#172f6b] ${filters.tab === value ? "border-black text-black" : "border-transparent text-[#827979] hover:text-slate-950"}`}>
            {label}
          </button>
        ))}
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Filter role" value={filters.role} disabled={working} onChange={(event) => changeFilter("role", event.target.value)} className={selectClass}>
          <option value="">Filter Role</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select aria-label="Filter program" value={filters.program} disabled={data.loading || Boolean(data.programError) || working} onChange={(event) => changeFilter("program", event.target.value)} className={selectClass}>
          <option value="">{data.programError ? "Programs unavailable" : "Filter Program"}</option>
          {data.programs.map((program) => <option key={program.id} value={program.id}>{program.program_name || program.name || "Unnamed program"}</option>)}
        </select>
        {filters.tab === "approved" && <select aria-label="Filter account status" value={filters.status} disabled={working} onChange={(event) => changeFilter("status", event.target.value)} className={selectClass}>
          <option value="approved">Approved accounts</option>
          <option value="deactivated">Deactivated accounts</option>
        </select>}
        <div className="relative min-w-48 flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-500" />
          <Input type="search" aria-label="Search users" placeholder="Search Name, ID, Email..." value={filters.search} disabled={working} onChange={(event) => changeFilter("search", event.target.value)} className="h-10 rounded-[8px] border-[#172f6b]/60 pl-9! shadow-none" />
        </div>
        <Button variant="ghost" disabled={working || data.loading} onClick={refresh}>Refresh</Button>
      </div>

      {data.programError && <div role="alert"><ErrorState title="Programs could not be loaded" message={data.programError} /></div>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
      {data.error ? <div role="alert" className="space-y-3"><ErrorState title="Unable to load users" message={data.error} /><Button variant="outline" onClick={refresh}>Try again</Button></div> : data.loading ? (
        <LoadingSkeleton variant="table" rows={10} columns={4} label="Loading users" />
      ) : filtered.length === 0 ? (
        <EmptyState title={filters.tab === "waiting" ? "No users waiting for approval" : "No users found"} message="No accounts match this view. Try changing the filters or search." />
      ) : (
        <>
          <p className="sr-only">Select a user's name to manage their account.</p>
          <Table className="min-w-[720px] table-fixed">
            <TableHeader><TableRow className="border-[#172f6b]/40 hover:bg-transparent">
              {["Name", "ID", "Department", "Email"].map((heading) => <TableHead key={heading} scope="col" className="h-12 w-1/4 px-3 font-bold text-[#172f6b]">{heading}</TableHead>)}
            </TableRow></TableHeader>
            <TableBody>
              {pagination.rows.map((user, index) => (
                <Fragment key={user.id}>
                  {filters.tab === "approved" && filters.role === "student" && (index === 0 || studentYearLabel(user) !== studentYearLabel(pagination.rows[index - 1])) && (
                    <TableRow className="border-[#172f6b]/40 bg-slate-50 hover:bg-slate-50"><TableCell colSpan={4} className="px-3 py-3 font-semibold text-[#172f6b]">{studentYearLabel(user)}</TableCell></TableRow>
                  )}
                  <TableRow className="border-[#172f6b]/40">
                    <TableCell className="px-3 py-5 whitespace-normal">
                      <button type="button" aria-expanded={selectedId === user.id} aria-controls={selectedId === user.id ? "managed-account" : undefined} disabled={working} className="cursor-pointer text-left font-medium underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-[#172f6b]" onClick={() => { setSelectedId(selectedId === user.id ? null : user.id); setSelectedRole(user.role); setActionError(""); setNotice(""); }}>
                        {pagination.start + index + 1}. {user.name || "Unnamed user"}
                      </button>
                    </TableCell>
                    <TableCell className="px-3 py-5 whitespace-normal">{userDisplayId(user)}</TableCell>
                    <TableCell className="px-3 py-5 whitespace-normal">{userDepartment(user, data.programs)}</TableCell>
                    <TableCell className="break-words px-3 py-5 whitespace-normal">{user.email || "Unavailable"}</TableCell>
                  </TableRow>
                  {selectedId === user.id && <TableRow className="border-[#172f6b]/40 bg-slate-50 hover:bg-slate-50"><TableCell colSpan={4} className="p-4 whitespace-normal">
                    <section id="managed-account" aria-label={`Manage ${user.name || "user"}`} className="space-y-4">
                      <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{user.name || "User"} · {ROLE_LABELS[user.role] || "Role unavailable"} · {userStatus(user) || "Status unavailable"}</h2><Button variant="ghost" size="icon-sm" aria-label="Close account actions" disabled={working} onClick={() => setSelectedId(null)}><X /></Button></div>
                      {String(user.id) === String(currentUser?.id) && <p className="text-sm text-slate-600">You cannot change your own role or account status.</p>}
                      {userStatus(user) === "pending" && <p className="text-sm text-slate-600">Pre-registered accounts activate on their first Google sign-in. The server checks whether this account can be approved. Assigning a staff role does not approve the account.</p>}
                      {actionError && <div role="alert"><ErrorState title="Account change failed" message={actionError} /></div>}
                      <div className="flex flex-wrap items-center gap-3">
                        {permissions.changeRole && <><select aria-label={`Assign role for ${user.name || "user"}`} className={selectClass} value={selectedRole} disabled={working} onChange={(event) => setSelectedRole(event.target.value)}>{STAFF_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select><Button disabled={working || selectedRole === user.role} onClick={() => changeAccount("role", selectedRole)}>Assign role</Button></>}
                        {permissions.changeStatus && <Button variant={userStatus(user) === "approved" ? "destructive" : "outline"} disabled={working} onClick={() => changeAccount("status", userStatus(user) === "approved" ? "deactivated" : "approved")}>
                          {userStatus(user) === "pending" ? "Approve account" : userStatus(user) === "approved" ? "Deactivate account" : "Reactivate account"}
                        </Button>}
                        {working && <span role="status" className="text-sm text-slate-600">Saving account change…</span>}
                      </div>
                    </section>
                  </TableCell></TableRow>}
                </Fragment>
              ))}
            </TableBody>
          </Table>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
            <p role="status">Showing {pagination.start + 1}–{pagination.start + pagination.rows.length} of {pagination.total} users</p>
            <nav aria-label="User list pagination" className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={pagination.page === 1 || working} onClick={() => { setPage(pagination.page - 1); setSelectedId(null); }}><ChevronLeft /></Button>
              <span>Page {pagination.page} of {pagination.pageCount}</span>
              <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={pagination.page === pagination.pageCount || working} onClick={() => { setPage(pagination.page + 1); setSelectedId(null); }}><ChevronRight /></Button>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
