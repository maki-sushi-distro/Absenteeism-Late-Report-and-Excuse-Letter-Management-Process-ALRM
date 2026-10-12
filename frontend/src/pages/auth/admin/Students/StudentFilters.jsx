import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { programLabel, programRecordId } from "./studentDisplay";

const yearOptions = ["1st", "2nd", "3rd", "4th"];

function SelectFilter({ label, value, onChange, children }) {
  return <div className="relative">
    <select value={value} onChange={onChange} aria-label={label}
      className="h-10 w-full min-w-0 appearance-none rounded-[5px] border border-[#9aa9cf] bg-white px-4 pr-10 text-sm font-medium text-slate-900 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:min-w-[204px]">
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-900" />
  </div>;
}

function StudentFilters({ filters, loadingPrograms, onChange, programs }) {
  return <div className="grid gap-2 sm:grid-cols-[minmax(220px,236px)_minmax(180px,204px)_minmax(160px,204px)]">
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
      <Input value={filters.search} onChange={(event) => onChange("search", event.target.value)}
        placeholder="Search Name..." aria-label="Search student name"
        className="h-10 rounded-[5px] border-[#9aa9cf] pl-9 text-sm shadow-none" />
    </div>
    <SelectFilter label="Filter course" value={filters.programId} onChange={(event) => onChange("programId", event.target.value)}>
      <option value="">{loadingPrograms ? "Loading Courses..." : "Filter Course"}</option>
      {programs.map((program, index) => <option key={programRecordId(program) || index} value={programRecordId(program)}>{programLabel(program)}</option>)}
    </SelectFilter>
    <SelectFilter label="Filter year" value={filters.yearLevel} onChange={(event) => onChange("yearLevel", event.target.value)}>
      <option value="">Filter Year</option>
      {yearOptions.map((year) => <option key={year} value={`${year} Year`}>{year} Year</option>)}
    </SelectFilter>
  </div>;
}

export default StudentFilters;
