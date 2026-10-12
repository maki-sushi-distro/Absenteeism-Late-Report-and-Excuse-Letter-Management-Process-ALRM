import { ChevronDown } from "lucide-react";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

function SelectField({ error, label, name, onChange, value, children }) {
  return <Field data-invalid={Boolean(error)}>
    <FieldLabel htmlFor={name}>{label}</FieldLabel>
    <div className="relative">
      <select id={name} name={name} value={value} onChange={onChange} aria-invalid={Boolean(error)}
        className="h-11 w-full appearance-none rounded-[5px] border border-slate-300 bg-white px-3 pr-10 text-sm text-slate-900 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20">
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
    </div>
    <FieldError>{error}</FieldError>
  </Field>;
}

export default SelectField;
