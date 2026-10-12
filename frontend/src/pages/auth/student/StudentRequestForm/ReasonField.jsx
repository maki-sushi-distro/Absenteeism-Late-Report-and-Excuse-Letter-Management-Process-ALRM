import { absenceReasonOptions, controlClass } from "./requestConfig";
import { ErrorText, FieldLabel, SectionBox } from "./RequestPrimitives";
import { Input } from "@/components/ui/input";

function ReasonField({ wizard }) {
  if (wizard.form.requestType === "absence") return <SectionBox invalid={Boolean(wizard.fieldErrors.absenceReasons)}>
    <div className="grid gap-2"><FieldLabel>Reason of Absence</FieldLabel>
      {absenceReasonOptions.map((reason) => <label key={reason} className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={wizard.form.absenceReasons.includes(reason)}
          onChange={() => wizard.toggleListField("absenceReasons", reason)} className="accent-[#101C4A]" />
        {reason}
      </label>)}
      <ErrorText message={wizard.fieldErrors.absenceReasons} />
    </div>
  </SectionBox>;

  return <SectionBox invalid={Boolean(wizard.fieldErrors.reason)}>
    <div className="grid gap-2"><FieldLabel>Reason</FieldLabel>
      <Input value={wizard.form.reason} onChange={(event) => wizard.updateField("reason", event.target.value)}
        aria-invalid={Boolean(wizard.fieldErrors.reason)}
        className={controlClass(wizard.fieldErrors.reason, "h-11 rounded-[9px] text-sm shadow-none")} />
      <ErrorText message={wizard.fieldErrors.reason} />
    </div>
  </SectionBox>;
}

export default ReasonField;
