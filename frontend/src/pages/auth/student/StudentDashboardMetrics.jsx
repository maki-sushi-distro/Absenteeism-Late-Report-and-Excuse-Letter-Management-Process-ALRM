import { CalendarDays, ClipboardList, FileText, GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function StudentDashboardMetrics({ requests, attendance, classes }) {
  const cards = [
    { label: "My Records", value: requests.length, icon: ClipboardList },
    { label: "Pending Requests", value: requests.filter((item) => item.status === "pending").length, icon: FileText },
    { label: "Attendance Alerts", value: attendance.filter((item) => ["warning", "IR"].includes(item.tracker?.status)).length, icon: CalendarDays },
    { label: "Classes", value: classes.length, icon: GraduationCap },
  ];

  return <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {cards.map(({ label, value, icon: Icon }) => <Card key={label} className="rounded-[5px] border border-slate-300 bg-slate-50 py-0 shadow-none dark:border-slate-800 dark:bg-slate-900">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-300">{label}</p>
          <p className="mt-3 text-3xl font-black text-slate-950 dark:text-slate-50">{value}</p>
        </div>
        <Icon className="size-5 text-[#203b82] dark:text-blue-300" />
      </CardContent>
    </Card>)}
  </section>;
}

export default StudentDashboardMetrics;
