const colors = {
  approved: "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200",
  noted: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  pending: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  invalid: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
  deactivated: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  IR: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
  warning: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
};

function StatusBadge({ value }) {
  return <span className={`inline-flex px-2 py-1 text-xs font-semibold capitalize ${colors[value] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>{value || "—"}</span>;
}

export default StatusBadge;
