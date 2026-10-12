import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function FormMessages({ success, error }) {
  return <>
    {success && <Alert className="border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200">
      <CheckCircle2 className="size-4" /><AlertTitle>Success</AlertTitle>
      <AlertDescription className="text-green-800 dark:text-green-200">{success}</AlertDescription>
    </Alert>}
    {error && <Alert variant="destructive">
      <AlertCircle className="size-4" /><AlertTitle>Unable to save</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>}
  </>;
}

export default FormMessages;
