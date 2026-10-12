import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

function FormActions({ onCancel, submitting, submitLabel }) {
  return <div className="flex flex-col-reverse gap-3 pt-10 sm:flex-row sm:justify-end">
    <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}
      className="h-9 rounded-[5px] border-slate-300 px-6 font-bold text-[#0b2f70]">Cancel</Button>
    <Button type="submit" disabled={submitting}
      className="h-9 rounded-[5px] bg-[#0b4bd3] px-6 font-bold text-white hover:bg-[#083da9]">
      {submitting && <Spinner className="mr-2" />}{submitting ? "Saving..." : submitLabel}
    </Button>
  </div>;
}

export default FormActions;
