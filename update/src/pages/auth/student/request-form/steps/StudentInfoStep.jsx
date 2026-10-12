import { Input } from "@/components/ui/input";
import ErrorText from "../components/ErrorText";
import FieldLabel from "../components/FieldLabel";
import FormNavigation from "../components/FormNavigation";
import HeaderIdentity from "../components/HeaderIdentity";
import RadioOption from "../components/RadioOption";
import RequestShell from "../components/RequestShell";
import SectionBox from "../components/SectionBox";
import { programOptions } from "../constants";
import {
  controlClass,
  normalizePhoneInput,
  yearOptionsForProgram,
} from "../utils";

const inputClass = "h-11 rounded-[9px] text-sm shadow-none";

function TextField({ label, error, children }) {
  return (
    <SectionBox invalid={Boolean(error)}>
      <div className="grid gap-2">
        <FieldLabel>{label}</FieldLabel>
        {children}
        <ErrorText message={error} />
      </div>
    </SectionBox>
  );
}

export default function StudentInfoStep({
  step,
  form,
  user,
  fieldErrors,
  updateField,
  handleRadioClick,
  onBack,
  onNext,
}) {
  return (
    <RequestShell requestType={form.requestType} step={step}>
      <HeaderIdentity requestType={form.requestType} step={step} user={user} />

      <SectionBox
        invalid={Boolean(fieldErrors.studentName)}
        title="Student Information"
      >
        <div className="grid gap-2">
          <FieldLabel>Student Name</FieldLabel>
          <Input
            value={form.studentName}
            onChange={(event) => updateField("studentName", event.target.value)}
            placeholder="Add text here..."
            aria-invalid={Boolean(fieldErrors.studentName)}
            className={controlClass(fieldErrors.studentName, inputClass)}
          />
          <ErrorText message={fieldErrors.studentName} />
        </div>
      </SectionBox>

      <SectionBox invalid={Boolean(fieldErrors.program)} title="Program">
        <div className="grid gap-2 sm:grid-cols-2">
          {programOptions.map((program) => (
            <RadioOption
              key={program}
              name="program"
              value={program}
              checked={form.program === program}
              onToggle={handleRadioClick}
              onChange={updateField}
            />
          ))}
        </div>
        <ErrorText message={fieldErrors.program} />
      </SectionBox>

      <SectionBox invalid={Boolean(fieldErrors.level)} title="Level">
        <div className="grid gap-2 sm:grid-cols-4">
          {yearOptionsForProgram(form.program).map((year) => (
            <RadioOption
              key={year}
              name="level"
              value={year}
              checked={form.level === year}
              onToggle={handleRadioClick}
              onChange={updateField}
            />
          ))}
        </div>
        <ErrorText message={fieldErrors.level} />
      </SectionBox>

      <TextField label="Parent/Guardian's Name" error={fieldErrors.guardianName}>
        <Input
          value={form.guardianName}
          onChange={(event) => updateField("guardianName", event.target.value)}
          placeholder="Add text here..."
          aria-invalid={Boolean(fieldErrors.guardianName)}
          className={controlClass(fieldErrors.guardianName, inputClass)}
        />
      </TextField>

      <TextField label="Contact Number" error={fieldErrors.contactNumber}>
        <Input
          value={form.contactNumber}
          onChange={(event) =>
            updateField("contactNumber", normalizePhoneInput(event.target.value))
          }
          placeholder="09XXXXXXXXX or +639XXXXXXXXX"
          aria-invalid={Boolean(fieldErrors.contactNumber)}
          className={controlClass(fieldErrors.contactNumber, inputClass)}
        />
      </TextField>

      <TextField label="Date Submitted" error={fieldErrors.dateSubmitted}>
        <Input
          type="date"
          value={form.dateSubmitted}
          onChange={(event) => updateField("dateSubmitted", event.target.value)}
          aria-invalid={Boolean(fieldErrors.dateSubmitted)}
          className={controlClass(fieldErrors.dateSubmitted, inputClass)}
        />
      </TextField>

      <FormNavigation onBack={onBack} onNext={onNext} />
    </RequestShell>
  );
}
