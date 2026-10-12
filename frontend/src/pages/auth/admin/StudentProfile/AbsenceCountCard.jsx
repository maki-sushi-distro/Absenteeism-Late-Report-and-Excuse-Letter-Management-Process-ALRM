import { Progress } from "@/components/ui/progress";

function AbsenceCountCard({ attendance }) {
  if (!attendance) return <div className="rounded-[5px] border border-slate-300 bg-slate-50 px-4 py-4">
    <p className="text-xs font-medium text-slate-950">Absence Count</p>
    <p className="mt-3 text-sm text-slate-600">Not available from the student profile API.</p>
  </div>;

  const threshold = Number(attendance.threshold || attendance.absence_threshold || 6);
  const count = Number(attendance.converted_absences ?? attendance.convertedAbsences ??
    attendance.absence_count ?? attendance.absenceCount ?? attendance.total_absences ?? attendance.totalAbsences ?? 0);
  const percent = threshold > 0 ? Math.min(100, Math.round((count / threshold) * 100)) : 0;

  return <div className="rounded-[5px] border border-slate-300 bg-slate-50 px-4 py-4">
    <p className="text-xs font-medium text-slate-950">Absence Count</p>
    <p className="mt-3 text-2xl font-black text-[#14285f]">{count}/{threshold}</p>
    <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
      <Progress value={percent} className="[&_[data-slot=progress-indicator]]:bg-[#203b82] [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:rounded-none [&_[data-slot=progress-track]]:bg-slate-300" />
      <span className="text-sm font-medium text-slate-950">{percent}%</span>
    </div>
    <div className="mt-1 border-t border-[#9aa9cf] pt-1 text-xs font-medium text-slate-950">Threshold: {threshold} Absences</div>
  </div>;
}

export default AbsenceCountCard;
