import { normalizePhoneInput, programOptions, yearOptionsForProgram } from "./requestConfig";
import RadioSection from "./RadioSection";
import TextFieldSection from "./TextFieldSection";

function StudentInfoStep({ wizard }) {
  return <>
    <TextFieldSection wizard={wizard} name="studentName" label="Student Name"
      title="Student Information" placeholder="Add text here..." />
    <RadioSection wizard={wizard} name="program" title="Program" options={programOptions} />
    <RadioSection wizard={wizard} name="level" title="Level"
      options={yearOptionsForProgram(wizard.form.program)} columns="sm:grid-cols-4" />
    <TextFieldSection wizard={wizard} name="guardianName" label="Parent/Guardian's Name"
      placeholder="Add text here..." />
    <TextFieldSection wizard={wizard} name="contactNumber" label="Contact Number"
      transform={normalizePhoneInput} placeholder="09XXXXXXXXX or +639XXXXXXXXX" />
    <TextFieldSection wizard={wizard} name="dateSubmitted" label="Date Submitted" type="date" />
  </>;
}

export default StudentInfoStep;
