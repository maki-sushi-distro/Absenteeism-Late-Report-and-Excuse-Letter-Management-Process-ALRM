import SelectField from "./SelectField";
import TextField from "./TextField";

function FormField({ field, value, error, onChange, programOptions, loadingPrograms }) {
  if (field.type === "program" || field.type === "select") {
    const options = field.type === "program" ? programOptions : field.options;
    return <SelectField name={field.name} label={field.label} value={value} onChange={onChange} error={error}>
      {field.type === "program" && <option value="">{loadingPrograms ? "Loading programs..." : "Select program"}</option>}
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </SelectField>;
  }

  return <TextField name={field.name} label={field.label} type={field.type} value={value}
    onChange={onChange} placeholder={field.placeholder} icon={field.icon} error={error} />;
}

export default FormField;
