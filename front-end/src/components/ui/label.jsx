<<<<<<< HEAD
import * as React from "react"
import { cn } from "cn"

function Label({
  className,
  ...props
}) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props} />
  );
}

export { Label }
=======
import { cn } from "@/lib/utils";

function Label({ className, ...props }) {
  return (
    <label
      className={cn("text-sm font-medium leading-none text-slate-700", className)}
      {...props}
    />
  );
}

export { Label };
>>>>>>> 124692977e7ca6e04e4feaf7312209e1c6c684cb
