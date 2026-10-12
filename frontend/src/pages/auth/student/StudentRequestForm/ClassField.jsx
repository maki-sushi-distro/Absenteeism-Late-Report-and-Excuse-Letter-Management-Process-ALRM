import { Input } from "@/components/ui/input";
import { classLabel, controlClass } from "./requestConfig";
import { ErrorText, SectionBox } from "./RequestPrimitives";

function AbsenceClassInput({ wizard }) {
  return <>
    <div className="grid gap-1 text-xs leading-relaxed text-slate-700">
      <p className="font-semibold">Subject(s)/Class(es)*</p>
      <p>Please list them in bullet form including the name of the instructor.</p>
    </div>
    <div className="grid gap-1 text-xs leading-relaxed text-slate-700">
      <p className="font-semibold">Example:</p>
      <ul className="ml-4 list-disc">
        <li>Mathematics 101 - Mr. Juan Dela Cruz</li>
        <li>English Communication - Mr. Juan Dela Cruz</li>
        <li>Information Management - Mr. Juan Dela Cruz</li>
      </ul>
    </div>
    <ul className="sr-only">{wizard.classes.map((item) => <li key={item.class_id}>{classLabel(item)}</li>)}</ul>
    <Input value={wizard.form.classText} onChange={(event) => wizard.updateField("classText", event.target.value)}
      aria-invalid={Boolean(wizard.fieldErrors.classText)}
      className={controlClass(wizard.fieldErrors.classText, "h-11 rounded-[9px] text-sm shadow-none")} />
  </>;
}

function LateClassSelect({ wizard }) {
  return <select value={wizard.form.classId} onChange={(event) => wizard.updateField("classId", event.target.value)}
    disabled={wizard.classesLoading} aria-invalid={Boolean(wizard.fieldErrors.classId)}
    className={controlClass(wizard.fieldErrors.classId, "h-11 w-full min-w-0 rounded-[9px] px-3 text-sm text-slate-700 outline-none")}>
    <option value="">{wizard.classesLoading ? "Loading classes..." : "Select class"}</option>
    {wizard.classes.map((item) => <option key={item.class_id} value={item.class_id}>{classLabel(item)}</option>)}
  </select>;
}

function ClassField({ wizard }) {
  const isAbsence = wizard.form.requestType === "absence";
  const error = isAbsence ? wizard.fieldErrors.classText : wizard.fieldErrors.classId;
  return <SectionBox invalid={Boolean(error)} title={isAbsence ? "Program" : "Program Subject/Class(es)"}>
    {isAbsence ? <AbsenceClassInput wizard={wizard} /> : <LateClassSelect wizard={wizard} />}
    {wizard.classesError && <p className="text-xs font-semibold text-red-600">{wizard.classesError}</p>}
    <ErrorText message={error} />
  </SectionBox>;
}

export default ClassField;
