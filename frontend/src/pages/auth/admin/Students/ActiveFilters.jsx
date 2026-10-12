import { Button } from "@/components/ui/button";

function ActiveFilters({ filters, programName, onClear }) {
  if (!filters.search && !filters.yearLevel && !programName) return null;

  return <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600">
    {filters.search && <span>Search: {filters.search}</span>}
    {programName && <span>Program: {programName}</span>}
    {filters.yearLevel && <span>Year: {filters.yearLevel}</span>}
    <Button type="button" variant="ghost" onClick={onClear}
      className="h-auto rounded-[5px] px-2 py-0 text-xs font-black text-[#203b82]">Clear filters</Button>
  </div>;
}

export default ActiveFilters;
