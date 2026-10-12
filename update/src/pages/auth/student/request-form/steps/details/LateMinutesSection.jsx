import { Input } from "@/components/ui/input";
import ErrorText from "../../components/ErrorText";
import FieldLabel from "../../components/FieldLabel";
import SectionBox from "../../components/SectionBox";
import { controlClass } from "../../utils";

export default function LateMinutesSection({ form, fieldErrors, updateField }) {
  return (
    <SectionBox
      invalid={Boolean(fieldErrors.minutesLate)}
      title="Tardiness Details"
    >
      <div className="grid gap-2">
        <FieldLabel>How many minutes late?</FieldLabel>
        <Input
          inputMode="numeric"
          value={form.minutesLate}
          onChange={(event) => updateField("minutesLate", event.target.value)}
          aria-invalid={Boolean(fieldErrors.minutesLate)}
          className={controlClass(
            fieldErrors.minutesLate,
            "h-11 rounded-[9px] text-sm shadow-none",
          )}
        />
        <ErrorText message={fieldErrors.minutesLate} />
      </div>
    </SectionBox>
  );
}
