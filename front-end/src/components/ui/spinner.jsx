<<<<<<< HEAD
import { cn } from "cn"
import { Loader2Icon } from "lucide-react"

function Spinner({
  className,
  ...props
}) {
  return (
    <Loader2Icon
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props} />
  );
}

export { Spinner }
=======
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
>>>>>>> 124692977e7ca6e04e4feaf7312209e1c6c684cb
