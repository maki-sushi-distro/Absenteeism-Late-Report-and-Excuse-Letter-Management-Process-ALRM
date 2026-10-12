import { Input } from "@/components/ui/input";
import { controlClass } from "./requestConfig";
import { ErrorText, FieldLabel, SectionBox } from "./RequestPrimitives";

function TextFieldSection({ wizard, name, label, title, type = "text", placeholder,
  inputMode, transform }) {
  const error = wizard.fieldErrors[name];
  return <SectionBox invalid={Boolean(error)} title={title}>
    <div className="grid gap-2">
      <FieldLabel>{label}</FieldLabel>
      <Input type={type} inputMode={inputMode} value={wizard.form[name]}
        onChange={(event) => wizard.updateField(name, transform ? transform(event.target.value) : event.target.value)}
        placeholder={placeholder} aria-invalid={Boolean(error)}
        className={controlClass(error, "h-11 rounded-[9px] text-sm shadow-none")} />
      <ErrorText message={error} />
    </div>
  </SectionBox>;
}

export default TextFieldSection;
