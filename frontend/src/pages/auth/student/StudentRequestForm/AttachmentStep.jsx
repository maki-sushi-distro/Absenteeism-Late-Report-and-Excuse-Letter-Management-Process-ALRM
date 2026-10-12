import { Upload } from "lucide-react";
import { proofOptions } from "./requestConfig";
import { FieldLabel, SectionBox } from "./RequestPrimitives";

function AttachmentStep({ wizard }) {
  return <>
    {wizard.form.requestType === "absence" && <SectionBox title="Explanation">
      <div className="grid gap-2"><FieldLabel>Supporting Documents / Proof of Absence</FieldLabel>
        {proofOptions.map((proof) => <label key={proof} className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={wizard.form.proofTypes.includes(proof)}
            onChange={() => wizard.toggleListField("proofTypes", proof)} className="accent-[#101C4A]" />
          {proof}
        </label>)}
      </div>
    </SectionBox>}
    <SectionBox title={wizard.form.requestType === "late" ? "Explanation" : undefined}>
      <FieldLabel>Please attach any applicable supporting document(s):</FieldLabel>
      <div className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-slate-200 bg-[#FBFBFD] px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        <span className="inline-flex items-center gap-2 font-bold text-slate-500"><Upload className="size-4" />File attachments unavailable</span>
        <span>The backend does not currently provide a file upload endpoint.</span>
      </div>
    </SectionBox>
  </>;
}

export default AttachmentStep;
