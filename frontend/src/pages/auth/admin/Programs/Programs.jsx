import { useState } from "react";
import { deleteProgram, getAdminUsers, getPrograms } from "@/api/dashboardData";
import { Button } from "@/components/ui/button";
import PageHeading from "@/components/dashboard/PageHeading";
import { ResourceState } from "@/components/dashboard/ResourceState";
import { useApiResource } from "@/hooks/useApiResource";
import AdminPageLayout from "../AdminPageLayout";
import ProgramForm from "./ProgramForm";
import ProgramTable from "./ProgramTable";

function loadPrograms() {
  return Promise.all([getPrograms(), getAdminUsers()]).then(([programs, users]) => ({ programs, heads: users.filter((user) => ["instructor", "program_head"].includes(user.role)) }));
}

function Programs() {
  const resource = useApiResource(loadPrograms);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  async function remove(program) {
    if (!window.confirm(`Delete ${program.program_name}? Programs with classes or users cannot be deleted.`)) return;
    setError("");
    try { await deleteProgram(program.id); resource.reload(); }
    catch (failure) { setError(failure.message); }
  }

  return <AdminPageLayout>
    <PageHeading title="Programs" description="Academic programs and assigned heads" action={<Button onClick={() => { setSelected(null); setShowForm(true); }} className="bg-[#203b82] text-white hover:bg-[#172e68]">Add program</Button>} />
    {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
    <ResourceState {...resource} onRetry={resource.reload}>
      <div className="grid gap-6">
        <ProgramTable programs={resource.data?.programs || []} onEdit={(program) => { setSelected(program); setShowForm(true); }} onDelete={remove} />
        {showForm && <ProgramForm key={selected?.id || "new"} selected={selected} heads={resource.data?.heads || []} onCancel={() => setShowForm(false)} onSaved={() => { setShowForm(false); resource.reload(); }} />}
      </div>
    </ResourceState>
  </AdminPageLayout>;
}

export default Programs;
