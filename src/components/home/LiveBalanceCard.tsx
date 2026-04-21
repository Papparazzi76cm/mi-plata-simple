import { Link } from "react-router-dom";
import { Wallet, ArrowRight, TrendingUp, PiggyBank, AlertTriangle, Sparkles, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatGs } from "@/lib/format";
import type { LiveBalance, SavingsProgress } from "@/lib/balance";
import type { Category } from "@/lib/categories";
import { ProLockTeaser } from "@/components/ProLockTeaser";

const statusStyles: Record<LiveBalance["status"], string> = {
  healthy: "gradient-card text-primary-foreground",
  warning: "bg-warn text-warn-foreground",
  danger: "bg-destructive text-destructive-foreground",
  over: "bg-destructive text-destructive-foreground",
};

const statusLabel: Record<LiveBalance["status"], string> = {
  healthy: "Saldo del mes",
  warning: "Atención al ritmo",
  danger: "Cerca del límite",
  over: "Excediste el presupuesto",
};

const savingsCopy: Record<SavingsProgress["status"], { label: string; emoji: string }> = {
  none: { label: "", emoji: "" },
  behind: { label: "Vas justo con la meta", emoji: "🐢" },
  onTrack: { label: "Vas en ritmo", emoji: "✅" },
  ahead: { label: "Vas adelantado", emoji: "🚀" },
  reached: { label: "¡Meta cumplida!", emoji: "🎉" },
};

interface CategoryAlert {
  cat: Category;
  pct: number;
  spent: number;
  limit: number;
}

interface Props {
  balance: LiveBalance;
  todayTotal: number;
  savings: SavingsProgress;
  categoryAlerts: CategoryAlert[];
  isPro: boolean;
}

export function LiveBalanceCard({ balance, todayTotal, savings, categoryAlerts, isPro }: Props) {
  // Sin presupuesto configurado → CTA suave
  if (!balance.hasBudget) {
    return (
      <Link
        to="/presupuesto-mensual"
        className="block rounded-3xl p-6 shadow-card animate-slide-up gradient-card text-primary-foreground active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center gap-2 opacity-90 text-sm font-medium">
          <Wallet className="h-4 w-4" />
          Configurá tu saldo del mes
        </div>
        <p className="text-2xl font-bold mt-2 leading-tight">
          ¿Cuánto tenés disponible este mes?
        </p>
        <p className="text-sm opacity-85 mt-2 leading-snug">
          Con tu presupuesto, te muestro cuánto te queda, cuánto podés gastar por día y
          una proyección de cómo cerrarías el mes.
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold bg-white/20 rounded-full px-4 py-2">
          Configurar ahora
          <ArrowRight className="h-4 w-4" />
        </div>
      </Link>
    );
  }

  const isOver = balance.status === "over";
  const totalBudget = balance.spent + balance.available + balance.fixedPending;
  const projVsBudgetPct = totalBudget > 0 ? Math.round((balance.projection / totalBudget) * 100) : 0;

  return (
    <section
      className={cn(
        "rounded-3xl p-6 shadow-card animate-slide-up",
        statusStyles[balance.status],
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm/none opacity-85 font-medium flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5" />
          {statusLabel[balance.status]}
        </p>
        <Link
          to="/presupuesto-mensual"
          className="text-[11px] font-semibold opacity-80 hover:opacity-100 underline-offset-2 hover:underline"
        >
          Editar
        </Link>
      </div>

      <p className="text-[11px] opacity-70 mt-3">
        {isOver ? "Te pasaste por" : "Te quedan"}
      </p>
      <p className="text-4xl font-bold mt-1 tracking-tight tabular-nums">
        {formatGs(Math.abs(balance.available))}
      </p>
      <p className="text-xs opacity-80 mt-1">
        {balance.daysLeft === 1
          ? "Para el último día del mes"
          : `Para los próximos ${balance.daysLeft} días`}
      </p>

      {/* Progress bar */}
      <div className="mt-4 h-2 rounded-full bg-white/25 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isOver ? "bg-white" : "bg-white/80",
          )}
          style={{ width: `${Math.min(100, balance.percentUsed)}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] opacity-80 tabular-nums">
        <span>{balance.percentUsed}% usado</span>
        <span>Día {balance.dayOfMonth}/{balance.daysInMonth}</span>
      </div>

      {/* Stat row */}
      <div className="mt-5 pt-5 border-t border-current/20 grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="opacity-75 text-[10px] uppercase tracking-wider">Hoy</p>
          <p className="font-semibold mt-1 tabular-nums truncate">{formatGs(todayTotal)}</p>
        </div>
        <div>
          <p className="opacity-75 text-[10px] uppercase tracking-wider">Por día</p>
          <p className="font-semibold mt-1 tabular-nums truncate">
            {balance.dailyAllowance > 0 ? formatGs(balance.dailyAllowance) : "—"}
          </p>
        </div>
        <div>
          <p className="opacity-75 text-[10px] uppercase tracking-wider flex items-center gap-0.5">
            <TrendingUp className="h-2.5 w-2.5" /> Cierre
          </p>
          <p className="font-semibold mt-1 tabular-nums truncate">
            {formatGs(balance.projection)}
          </p>
        </div>
      </div>

      {balance.fixedPending > 0 && (
        <p className="mt-3 text-[11px] opacity-80 leading-snug">
          Reservamos {formatGs(balance.fixedPending)} para tus fijos pendientes
          {balance.fixedSpent > 0 && ` · Ya pagaste ${formatGs(balance.fixedSpent)}`}
        </p>
      )}

      {totalBudget > 0 && projVsBudgetPct >= 105 && (
        <p className="mt-2 text-[11px] font-semibold leading-snug">
          ⚠️ A este ritmo cerrás {projVsBudgetPct - 100}% sobre tu presupuesto
        </p>
      )}

      {/* META DE AHORRO */}
      {savings.hasGoal && (
        <div className="mt-5 pt-5 border-t border-current/20">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[11px] uppercase tracking-wider opacity-85 font-semibold flex items-center gap-1.5">
              <PiggyBank className="h-3.5 w-3.5" />
              Meta de ahorro
            </p>
            <span className="text-[11px] font-semibold opacity-90">
              {savingsCopy[savings.status].emoji} {savingsCopy[savings.status].label}
            </span>
          </div>
          <div className="flex items-baseline justify-between text-sm mb-1.5 tabular-nums">
            <span className="font-bold">{formatGs(savings.current)}</span>
            <span className="opacity-80 text-xs">de {formatGs(savings.goal)}</span>
          </div>
          <div className="h-2 rounded-full bg-white/25 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/90 transition-all"
              style={{ width: `${Math.min(100, savings.percent)}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] opacity-80 tabular-nums">
            <span>{savings.percent}% logrado</span>
            {savings.projection > 0 && savings.status !== "reached" && (
              <span className="flex items-center gap-0.5">
                <Sparkles className="h-2.5 w-2.5" />
                Proyección: {formatGs(savings.projection)}
              </span>
            )}
          </div>
        </div>
      )}

      {!savings.hasGoal && (
        <Link
          to="/presupuesto-mensual"
          className="mt-4 flex items-center justify-between gap-2 text-[11px] font-medium opacity-85 hover:opacity-100 bg-white/15 rounded-xl px-3 py-2 transition"
        >
          <span className="flex items-center gap-1.5">
            <PiggyBank className="h-3.5 w-3.5" />
            Fijate una meta de ahorro
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}

      {/* CATEGORÍAS CERCA DEL LÍMITE */}
      {categoryAlerts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-current/20">
          <p className="text-[11px] uppercase tracking-wider opacity-85 font-semibold flex items-center gap-1.5 mb-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            Cerca del límite
          </p>
          <ul className="space-y-2">
            {categoryAlerts.map(({ cat, pct, spent, limit }) => (
              <li key={cat.id}>
                <Link
                  to={`/category/${cat.id}`}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className="text-base leading-none">{cat.emoji}</span>
                  <span className="flex-1 truncate font-medium">{cat.label}</span>
                  <span className="tabular-nums opacity-90">
                    {formatGs(spent)} / {formatGs(limit)}
                  </span>
                  <span
                    className={cn(
                      "tabular-nums font-bold px-1.5 py-0.5 rounded-md text-[10px]",
                      pct >= 100 ? "bg-white text-destructive" : "bg-white/25",
                    )}
                  >
                    {pct}%
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
