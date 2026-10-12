import { Button } from "@/components/ui/button";
import DataTable from "@/components/dashboard/DataTable";

function ProgramTable({ programs, onEdit, onDelete }) {
  const columns = [
    { key: "program_name", label: "Program" },
    { key: "head", label: "Program head", render: (row) => row.program_head?.name || "Unassigned" },
    { key: "classes_count", label: "Classes" },
    { key: "users_count", label: "Users" },
    { key: "actions", label: "Actions", render: (row) => <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => onEdit(row)}>Edit</Button><Button size="sm" variant="outline" onClick={() => onDelete(row)}>Delete</Button></div> },
  ];

  return <DataTable columns={columns} rows={programs} empty="No programs found." />;
}

export default ProgramTable;
