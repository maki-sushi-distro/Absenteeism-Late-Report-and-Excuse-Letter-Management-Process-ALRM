import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import ErrorText from "../components/ErrorText";
import HeaderIdentity from "../components/HeaderIdentity";
import RequestShell from "../components/RequestShell";
import SectionBox from "../components/SectionBox";

export default function ReviewStep({
  step,
  form,
  user,
  error,
  fieldErrors,
  submitting,
  updateField,
  onBack,
}) {
  return (
    <RequestShell requestType={form.requestType} step={step}>
      <HeaderIdentity requestType={form.requestType} step={step} user={user} />
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Unable to submit</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <SectionBox
        invalid={Boolean(fieldErrors.declaration)}
        title="Student Declaration"
      >
        <p className="rounded-[10px] border border-slate-200 bg-white p-4 text-sm font-semibold leading-relaxed text-slate-700">
          I hereby certify that the information provided above is true and
          correct. I understand that submission of this form does not
          automatically excuse my{" "}
          {form.requestType === "absence" ? "absence" : "tardiness"} and remains
          subject to verification and approval by the appropriate authority.
        </p>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.declaration}
            onChange={(event) =>
              updateField("declaration", event.target.checked)
            }
            className="mt-1 accent-[#101C4A]"
          />
          I acknowledge and agree to the statement above.
        </label>
        <ErrorText message={fieldErrors.declaration} />
      </SectionBox>
      <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-5">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-11 rounded-[9px] border-[1.5px] border-slate-200 px-5 text-sm font-bold text-slate-500 hover:text-slate-950"
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="h-11 rounded-[9px] bg-[#101C4A] px-6 text-sm font-bold text-white hover:bg-[#1B2B6B]"
        >
          {submitting && <Spinner className="mr-2" />}
          Submit
        </Button>
      </div>
    </RequestShell>
  );
}
