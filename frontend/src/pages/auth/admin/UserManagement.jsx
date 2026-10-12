import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deleteAdminUser, getAdminUsers, updateAdminUserRole, updateAdminUserStatus } from "@/api/dashboardData";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/dashboard/DataTable";
import PageHeading from "@/components/dashboard/PageHeading";
import { ResourceState } from "@/components/dashboard/ResourceState";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useApiResource } from "@/hooks/useApiResource";
import AdminPageLayout from "./AdminPageLayout";

const staffRoles = ["instructor", "program_head", "administrator"];

function UserActions({ user, currentUserId, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isSelf = user.id === currentUserId;
  async function act(operation, message) {
    if (!window.confirm(message)) return;
    setBusy(true);
    setError("");
    try { await operation(); onChange(); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <div className="grid gap-2">
    {user.role !== "student" && !isSelf && <select aria-label={`Change role for ${user.name}`} value={user.role || ""} disabled={busy} onChange={(event) => { const nextRole = event.target.value; event.target.value = user.role; act(() => updateAdminUserRole(user.id, nextRole), `Change ${user.name}'s role to ${nextRole}?`); }} className="h-8 border border-slate-300 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-950">{staffRoles.map((role) => <option key={role} value={role}>{role.replace("_", " ")}</option>)}</select>}
    {!isSelf && <div className="flex gap-2">
      {user.status === "approved" ? <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => updateAdminUserStatus(user.id, "deactivated"), `Deactivate ${user.name}? This will revoke their sessions.`)}>Deactivate</Button> : user.status === "deactivated" ? <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => updateAdminUserStatus(user.id, "approved"), `Reactivate ${user.name}?`)}>Reactivate</Button> : <Button size="sm" variant="outline" disabled={busy || !user.google_id} title={!user.google_id ? "Available after the user's first Google sign-in" : undefined} onClick={() => act(() => updateAdminUserStatus(user.id, "approved"), `Approve ${user.name}?`)}>Approve</Button>}
      {(user.status === "pending" || user.status === "deactivated") && <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => deleteAdminUser(user.id), `Permanently remove ${user.name}?`)}>Remove</Button>}
    </div>}
    {error && <p role="alert" className="max-w-xs text-xs text-red-600">{error}</p>}
  </div>;
}

function UserManagement() {
  const { user } = useAuth();
  const resource = useApiResource(getAdminUsers);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const rows = (resource.data || []).filter((item) => (!role || item.role === role) && (!search || `${item.name} ${item.email}`.toLowerCase().includes(search.toLowerCase())));
  const columns = useMemo(() => [
    { key: "name", label: "Name", render: (item) => <span className="font-semibold">{item.name}</span> },
    { key: "email", label: "LV Email" },
    { key: "role", label: "Role", render: (item) => <span className="capitalize">{item.role?.replace("_", " ")}</span> },
    { key: "status", label: "Status", render: (item) => <StatusBadge value={item.status} /> },
    { key: "actions", label: "Actions", render: (item) => <UserActions user={item} currentUserId={user?.id} onChange={resource.reload} /> },
  ], [resource.reload, user?.id]);
  return <AdminPageLayout>
    <PageHeading title="User Management" description="Accounts and approvals" action={<div className="flex gap-2"><Link to="/students/add" className="rounded-[5px] border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700">Add student</Link><Link to="/instructors/add" className="rounded-[5px] bg-[#203b82] px-3 py-2 text-sm font-semibold text-white">Add instructor</Link></div>} />
    <div className="mb-4 flex flex-wrap gap-3"><input aria-label="Search users" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="h-10 w-full min-w-0 border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 sm:w-64" /><select aria-label="Filter by role" value={role} onChange={(event) => setRole(event.target.value)} className="h-10 w-full min-w-0 border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 sm:w-auto"><option value="">All roles</option><option value="student">Student</option>{staffRoles.map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}</select></div>
    <ResourceState {...resource} onRetry={resource.reload}><DataTable columns={columns} rows={rows} empty="No users match these filters." /></ResourceState>
  </AdminPageLayout>;
}

export default UserManagement;
