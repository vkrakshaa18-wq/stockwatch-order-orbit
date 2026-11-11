import { Boxes } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-primary text-primary-foreground shadow-elegant">
        <Boxes className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <div className={cn("font-display text-sm font-bold", light ? "text-sidebar-accent-foreground" : "text-foreground")}>Stock Management</div>
        <div className={cn("text-[11px] font-medium uppercase tracking-wider", light ? "text-sidebar-foreground/70" : "text-muted-foreground")}>System</div>
      </div>
    </div>
  );
}
