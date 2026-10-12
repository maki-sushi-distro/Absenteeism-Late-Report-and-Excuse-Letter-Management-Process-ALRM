import ClassField from "./ClassField";
import ReasonField from "./ReasonField";
import TextFieldSection from "./TextFieldSection";

function DetailsStep({ wizard }) {
  return <>
    {wizard.form.requestType === "absence" ? <>
      <TextFieldSection wizard={wizard} name="startDateOfAbsence" label="Start Date of Absence"
        type="date" title="Absence Details" />
      <TextFieldSection wizard={wizard} name="endDateOfAbsence" label="End Date of Absence" type="date" />
    </> : <TextFieldSection wizard={wizard} name="minutesLate" label="How many minutes late?"
      inputMode="numeric" title="Tardiness Details" />}
    <ClassField wizard={wizard} />
    <ReasonField wizard={wizard} />
  </>;
}

export default DetailsStep;
