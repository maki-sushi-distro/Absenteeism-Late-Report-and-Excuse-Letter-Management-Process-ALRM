import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function SettingsCard({ icon: Icon, title, description, children }) {
  return <Card className="rounded-[6px] border border-slate-200 bg-white py-0 shadow-none ring-0 dark:border-slate-800 dark:bg-slate-900">
    <CardHeader className="border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[6px] bg-[#203b82]/10 text-[#203b82] dark:bg-blue-400/15 dark:text-blue-300">
          <Icon className="size-5" strokeWidth={2.1} />
        </div>
        <div className="min-w-0">
          <CardTitle className="text-base font-black text-slate-950">{title}</CardTitle>
          <CardDescription className="mt-1 text-sm text-slate-600">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="px-5 py-5 sm:px-6">{children}</CardContent>
  </Card>;
}

export default SettingsCard;
