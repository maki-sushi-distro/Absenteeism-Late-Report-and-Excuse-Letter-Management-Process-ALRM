import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const statusOptions = ["all", "approved", "valid", "invalid", "pending"];

function RequestFilters({ search, status, onSearchChange, onStatusChange }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="relative w-full sm:max-w-[210px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
      <Input value={search} onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search Requests..." aria-label="Search requests"
        className="h-9 rounded-[5px] border-[#9aa9cf] pl-9 text-sm shadow-none" />
    </div>
    <div className="relative w-full sm:w-[126px]">
      <select value={status} onChange={(event) => onStatusChange(event.target.value)} aria-label="Filter request status"
        className="h-9 w-full appearance-none rounded-[5px] border border-[#9aa9cf] bg-white px-3 pr-9 text-sm font-medium text-[#203b82] outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        {statusOptions.map((option) => <option key={option} value={option}>{option === "all" ? "All Status" : option[0].toUpperCase() + option.slice(1)}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#203b82] dark:text-blue-200" />
    </div>
  </div>;
}

export default RequestFilters;
