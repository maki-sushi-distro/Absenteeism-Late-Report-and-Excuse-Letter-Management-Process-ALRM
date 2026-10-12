import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ErrorText, SectionBox } from "./RequestPrimitives";

function ReviewStep({ wizard }) {
  return <>
    {wizard.error && <Alert variant="destructive">
      <AlertCircle className="size-4" /><AlertTitle>Unable to submit</AlertTitle>
      <AlertDescription>{wizard.error}</AlertDescription>
    </Alert>}
    <SectionBox invalid={Boolean(wizard.fieldErrors.declaration)} title="Student Declaration">
      <p className="rounded-[10px] border border-slate-200 bg-white p-4 text-sm font-semibold leading-relaxed text-slate-700">
        I hereby certify that the information provided above is true and correct. I understand that submission of this form does not automatically excuse my{" "}
        {wizard.form.requestType === "absence" ? "absence" : "tardiness"} and remains subject to verification and approval by the appropriate authority.
      </p>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={wizard.form.declaration}
          onChange={(event) => wizard.updateField("declaration", event.target.checked)}
          className="mt-1 accent-[#101C4A]" />
        I acknowledge and agree to the statement above.
      </label>
      <ErrorText message={wizard.fieldErrors.declaration} />
    </SectionBox>
  </>;
}

export default ReviewStep;
