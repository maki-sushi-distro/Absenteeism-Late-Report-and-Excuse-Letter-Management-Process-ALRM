import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { requestTitle } from "./requestConfig";
import { RequestTitle } from "./RequestPrimitives";

function RequestSuccess({ requestType, onReset }) {
  return <div className="mx-auto w-full max-w-[760px]">
    <Card className="rounded-2xl border border-slate-200 bg-white py-0 shadow-sm">
      <CardContent className="grid gap-5 px-5 py-7 sm:px-10 sm:py-9">
        <div className="grid justify-items-center gap-4 py-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-[#2E9E6B]">
            <CheckCircle2 className="size-7" />
          </div>
          <RequestTitle>{requestTitle(requestType)} - <span className="font-medium">Higher Education Department</span></RequestTitle>
          <p className="text-sm font-semibold text-slate-600">Your response has been recorded.</p>
          <button type="button" onClick={onReset}
            className="text-sm font-bold text-[#101C4A] underline-offset-4 hover:underline">Submit another response</button>
        </div>
      </CardContent>
    </Card>
  </div>;
}

export default RequestSuccess;
