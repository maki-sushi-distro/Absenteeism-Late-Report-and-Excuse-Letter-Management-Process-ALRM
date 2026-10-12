import { Search } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import RequestRow from "./RequestRow";

const headers = ["Date", "Class", "Reason", "Date Absent/late", "Status"];

function RequestsTable({ requests }) {
  if (!requests.length) return <Empty className="min-h-[180px] rounded-[5px] border border-slate-200">
    <EmptyHeader><EmptyMedia variant="icon"><Search className="size-4" /></EmptyMedia>
      <EmptyTitle>No requests found</EmptyTitle>
      <EmptyDescription>Try a different request search or status filter.</EmptyDescription>
    </EmptyHeader>
  </Empty>;

  return <div className="overflow-x-auto border border-slate-200"><Table className="min-w-[780px]">
    <TableHeader className="bg-slate-100"><TableRow className="hover:bg-transparent">
      {headers.map((header) => <TableHead key={header} className="px-4 py-3 text-xs font-black text-slate-950">{header}</TableHead>)}
    </TableRow></TableHeader>
    <TableBody>{requests.map((request) => <RequestRow key={request.id} request={request} />)}</TableBody>
  </Table></div>;
}

export default RequestsTable;
