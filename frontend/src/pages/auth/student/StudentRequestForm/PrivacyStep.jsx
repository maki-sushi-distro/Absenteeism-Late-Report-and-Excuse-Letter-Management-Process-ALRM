import { ErrorText, SectionBox } from "./RequestPrimitives";
import ToggleRadio from "./ToggleRadio";

function PrivacyStep({ wizard }) {
  const { form, fieldErrors, updateField, handleRadioClick } = wizard;
  return <>
    <SectionBox title="Data Privacy Notice">
      <p className="text-sm leading-relaxed text-slate-700">In compliance with data privacy laws, including Republic Act No. 10173 Philippine Data Privacy Act of 2012, the Higher Education Department collects, uses, stores, and processes your personal information in this form for documentation and attendance tracking purposes only.</p>
      <p className="text-sm leading-relaxed text-slate-700">For your data privacy inquiries, you may reach our Data Protection Officer through:</p>
      <p className="text-sm font-semibold text-slate-700">Email: dpo@laverdad.edu.ph</p>
    </SectionBox>
    <SectionBox invalid={Boolean(fieldErrors.consent)} title="Compliance and Consent">
      <p className="text-sm leading-relaxed text-slate-700">By ticking "I Agree", I voluntarily give my consent to LVCC in collecting, processing, recording, using, and retaining my personal information for the above-mentioned purpose in accordance with this Privacy Notice.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <ToggleRadio name="consent" value="agree" checked={form.consent === "agree"} onChange={updateField} onClick={handleRadioClick}>I Agree</ToggleRadio>
        <ToggleRadio name="consent" value="disagree" checked={form.consent === "disagree"} onChange={updateField} onClick={handleRadioClick}>I Disagree</ToggleRadio>
      </div>
      <ErrorText message={fieldErrors.consent} />
    </SectionBox>
  </>;
}

export default PrivacyStep;
