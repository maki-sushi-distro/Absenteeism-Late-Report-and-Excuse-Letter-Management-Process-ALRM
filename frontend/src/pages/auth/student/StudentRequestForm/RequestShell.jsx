import { Card, CardContent } from "@/components/ui/card";
import { HeaderIdentity } from "./RequestPrimitives";
import RequestStepper from "./RequestStepper";

function RequestShell({ children, requestType, step, user }) {
  return <div className="mx-auto w-full min-w-0 max-w-[760px]">
    <RequestStepper currentStep={step} requestType={requestType} />
    <Card className="rounded-2xl border border-slate-200 bg-white py-0 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <CardContent className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 px-5 py-7 sm:px-10 sm:py-9">
        {step > 0 && <HeaderIdentity requestType={requestType} step={step} user={user} />}
        {children}
      </CardContent>
    </Card>
  </div>;
}

export default RequestShell;
