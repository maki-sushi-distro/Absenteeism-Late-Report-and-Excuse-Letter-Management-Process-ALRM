import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function ResourceState({ loading, error, empty, onRetry, children }) {
  if (loading) return <div role="status" className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500"><Spinner /> Loading...</div>;
  if (error) return (
    <div role="alert" className="flex min-h-40 flex-col items-start justify-center gap-3 border-l-4 border-red-500 bg-red-50 p-5 text-sm text-red-900 dark:bg-red-950/30 dark:text-red-200">
      <span className="flex items-center gap-2 font-semibold"><AlertCircle className="size-4" /> {error}</span>
      {onRetry && <Button type="button" variant="outline" size="sm" onClick={onRetry}><RefreshCw className="size-4" /> Retry</Button>}
    </div>
  );
  if (empty) return <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">{empty}</p>;
  return children;
}
