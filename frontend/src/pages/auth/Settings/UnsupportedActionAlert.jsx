import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function UnsupportedActionAlert({ notice }) {
  if (!notice) return null;
  return <Alert className="mb-5 border-amber-200 bg-amber-50 text-amber-950">
    <AlertCircle className="size-4" />
    <AlertTitle>{notice.title}</AlertTitle>
    <AlertDescription className="text-amber-900">{notice.description}</AlertDescription>
  </Alert>;
}

export default UnsupportedActionAlert;
