import { ErrorText, SectionBox } from "./RequestPrimitives";
import ToggleRadio from "./ToggleRadio";

function RadioSection({ wizard, name, title, options, columns = "sm:grid-cols-2" }) {
  return <SectionBox invalid={Boolean(wizard.fieldErrors[name])} title={title}>
    <div className={`grid gap-2 ${columns}`}>
      {options.map((option) => <ToggleRadio key={option} name={name} value={option}
        checked={wizard.form[name] === option} onChange={wizard.updateField}
        onClick={wizard.handleRadioClick}>{option}</ToggleRadio>)}
    </div>
    <ErrorText message={wizard.fieldErrors[name]} />
  </SectionBox>;
}

export default RadioSection;
