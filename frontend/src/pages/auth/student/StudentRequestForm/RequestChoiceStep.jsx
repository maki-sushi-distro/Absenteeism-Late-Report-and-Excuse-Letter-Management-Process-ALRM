import { requestOptions, controlClass } from "./requestConfig";
import { ErrorText, Eyebrow, FieldLabel, RequestTitle } from "./RequestPrimitives";

function RequestChoiceStep({ wizard }) {
  const { form, fieldErrors, updateField } = wizard;
  return <>
    <div className="grid gap-2">
      <Eyebrow step={0} requestType={form.requestType} />
      <RequestTitle>Request Form - <span className="font-medium">Higher Education Department</span></RequestTitle>
      <p className="max-w-[520px] text-sm leading-relaxed text-slate-500">Choose the request you want to submit. The next steps will adjust based on your selected form.</p>
    </div>
    <div className="mt-2 grid gap-3">
      <FieldLabel>Request</FieldLabel>
      <select id="request-type" value={form.requestType} onChange={(event) => updateField("requestType", event.target.value)}
        aria-invalid={Boolean(fieldErrors.requestType)}
        className={controlClass(fieldErrors.requestType, "h-11 rounded-[9px] px-3 text-sm text-slate-700 outline-none")}>
        <option value="">Select a request</option>
        {requestOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ErrorText message={fieldErrors.requestType} />
    </div>
  </>;
}

export default RequestChoiceStep;
