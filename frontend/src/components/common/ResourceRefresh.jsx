import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ResourceRefresh({ loading, onRefresh }) {
  return (
    <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={onRefresh} className="h-8 gap-1.5 px-2 text-xs">
      <RefreshCw aria-hidden="true" className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
    </Button>
  );
}
