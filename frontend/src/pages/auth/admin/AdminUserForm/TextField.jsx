import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function TextField({ error, icon: Icon, label, name, onChange, placeholder, type = "text", value }) {
  return <Field data-invalid={Boolean(error)}>
    <FieldLabel htmlFor={name}>{label}</FieldLabel>
    <div className="relative">
      {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" strokeWidth={1.7} />}
      <Input id={name} name={name} type={type} value={value} onChange={onChange}
        placeholder={placeholder} aria-invalid={Boolean(error)}
        className={cn("h-11 rounded-[5px] border-slate-300 text-sm shadow-none", Icon && "pl-9")} />
    </div>
    <FieldError>{error}</FieldError>
  </Field>;
}

export default TextField;
