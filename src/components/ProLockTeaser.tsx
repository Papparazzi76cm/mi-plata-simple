import { Link } from "react-router-dom";
import { Lock, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description: string;
  /** Variante visual: "card" (sobre fondo del card de saldo) o "block" (standalone). */
  variant?: "card" | "block";
}

export function ProLockTeaser({ title, description, variant = "card" }: Props) {
  const isOnCard = variant === "card";
  return (
    <Link
      to="/upgrade"
      className={cn(
        "block rounded-2xl p-3.5 transition active:scale-[0.99] group",
        isOnCard
          ? "bg-white/15 hover:bg-white/20 border border-white/25"
          : "bg-card shadow-soft border border-primary/20 hover:border-primary/40",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
            isOnCard ? "bg-white/20" : "gradient-primary text-primary-foreground",
          )}
        >
          <Lock className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-semibold flex items-center gap-1.5", isOnCard ? "" : "text-foreground")}>
            {title}
            <Crown className={cn("h-3.5 w-3.5", isOnCard ? "opacity-90" : "text-primary")} />
          </p>
          <p className={cn("text-[11px] mt-0.5 leading-snug", isOnCard ? "opacity-85" : "text-muted-foreground")}>
            {description}
          </p>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px] font-bold mt-2 uppercase tracking-wider rounded-full px-2.5 py-1",
              isOnCard
                ? "bg-white/25 text-current"
                : "gradient-primary text-primary-foreground",
            )}
          >
            Desbloquear PRO →
          </span>
        </div>
      </div>
    </Link>
  );
}
