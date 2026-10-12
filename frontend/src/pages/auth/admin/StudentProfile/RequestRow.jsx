import { TableCell, TableRow } from "@/components/ui/table";
import { formatDate, requestClass, requestDate, requestReason, requestStatus,
  requestSubmittedDate, statusClassName, statusLabel } from "./profileDisplay";

function RequestRow({ request }) {
  const status = requestStatus(request);
  return <TableRow className="hover:bg-transparent">
    <TableCell className="px-4 py-4 text-xs font-bold text-slate-950">{formatDate(requestSubmittedDate(request))}</TableCell>
    <TableCell className="px-4 py-4 text-xs font-bold text-slate-950">{requestClass(request)}</TableCell>
    <TableCell className="max-w-[260px] truncate px-4 py-4 text-xs font-medium text-slate-950">{requestReason(request)}</TableCell>
    <TableCell className="px-4 py-4 text-xs font-medium text-slate-950">{formatDate(requestDate(request))}</TableCell>
    <TableCell className="px-4 py-4 text-xs font-medium text-slate-950">
      <span className={`inline-flex min-w-[48px] justify-center rounded-[3px] border px-2 py-0.5 text-[11px] font-bold ${statusClassName(status)}`}>
        {statusLabel(status)}
      </span>
    </TableCell>
  </TableRow>;
}

export default RequestRow;
