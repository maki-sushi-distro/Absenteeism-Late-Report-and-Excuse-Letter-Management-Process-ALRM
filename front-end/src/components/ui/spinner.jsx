import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function Spinner({ className, ...props }) {
  return (
    <LoaderCircle
      className={cn("size-4 animate-spin text-current", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Spinner };
