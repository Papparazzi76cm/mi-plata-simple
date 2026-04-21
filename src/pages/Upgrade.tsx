import { useState } from "react";
import { Link } from "react-router-dom";
import { Crown, Check, Sparkles, ArrowLeft, Loader2, X, ShieldCheck, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSubscription } from "@/hooks/useSubscription";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { PRO_PRICE_ID } from "@/lib/paddle";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { cn } from "@/lib/utils";

const FEATURES_PRO = [
  { icon: "🎯", title: "Meta de ahorro mensual", desc: "Fijate cuánto querés ahorrar y mirá tu progreso en vivo." },
  { icon: "🔮", title: "Proyección de cierre del mes", desc: "Anticipá cómo cerrás el mes si seguís a este ritmo." },
  { icon: "📈", title: "Próximas funciones PRO", desc: "Insights avanzados, exportes y más, sin pagar de nuevo." },
];

const FEATURES_FREE = [
  "Saldo vivo del mes",
  "Presupuestos por categoría",
  "Coach diario e insights",
  "Recordatorios y racha",
];

export default function Upgrade() {
  const { isPro, state, subscription, loading } = useSubscription();
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isReactivation = state === "expired" || state === "past_due";

  const handleConfirm = async () => {
    setConfirmOpen(false);
    await openCheckout(PRO_PRICE_ID);
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <PaymentTestModeBanner />
      <div className="px-5 pt-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="h-10 w-10 rounded-full bg-card shadow-soft flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="text-xs text-muted-foreground">Mi Plata</p>
          <div className="w-10" />
        </div>

        {/* Hero */}
        <header className="text-center mb-8 animate-slide-up">
          <div className="inline-flex h-16 w-16 rounded-3xl gradient-primary text-primary-foreground items-center justify-center mb-4 shadow-card">
            <Crown className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Mi Plata PRO</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-snug px-2">
            Pasá de registrar gastos a <span className="font-semibold text-foreground">decidir mejor</span> con tu coach financiero.
          </p>
        </header>

        {/* Estado actual */}
        {!loading && isPro && (
          <section className="rounded-3xl gradient-card text-primary-foreground p-5 shadow-card mb-6 animate-slide-up">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-90 font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              Suscripción activa
            </div>
            <p className="text-2xl font-bold mt-2">¡Ya sos PRO!</p>
            <p className="text-sm opacity-90 mt-1">
              {state === "canceled" && subscription?.current_period_end
                ? `Tenés acceso hasta ${new Date(subscription.current_period_end).toLocaleDateString("es-PY", { day: "numeric", month: "short" })}.`
                : "Disfrutá todas las funciones sin límites."}
            </p>
            {state === "canceled" && (
              <p className="text-xs opacity-80 mt-2">
                Tu suscripción se canceló y no se renovará. Podés volver cuando quieras.
              </p>
            )}
          </section>
        )}

        {!loading && state === "past_due" && (
          <section className="rounded-3xl bg-warn text-warn-foreground p-5 shadow-card mb-6">
            <p className="text-sm font-semibold">⚠️ Tu pago está pendiente</p>
            <p className="text-xs opacity-90 mt-1">
              Estamos reintentando el cobro. Actualizá tu método de pago para no perder PRO.
            </p>
          </section>
        )}

        {!loading && state === "expired" && (
          <section className="rounded-3xl bg-destructive/10 border border-destructive/30 p-5 mb-6">
            <p className="text-sm font-semibold text-destructive">Tu suscripción venció</p>
            <p className="text-xs text-muted-foreground mt-1">
              Reactivá PRO abajo para volver a desbloquear meta de ahorro y proyecciones.
            </p>
          </section>
        )}

        {/* Plan PRO */}
        <section className="rounded-3xl bg-card shadow-card p-6 mb-5 border-2 border-primary/40 relative">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded-full px-3 py-1 shadow-soft">
            Recomendado
          </span>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-4xl font-bold tracking-tight">$2,99</span>
            <span className="text-muted-foreground text-sm">/ mes</span>
          </div>
          <p className="text-xs text-muted-foreground mb-5">Cancelá cuando quieras · sin compromiso</p>

          <ul className="space-y-3 mb-6">
            {FEATURES_PRO.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="text-xl leading-none">{f.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={checkoutLoading || (isPro && state !== "expired")}
            className={cn(
              "w-full h-12 rounded-2xl text-base font-bold gradient-primary text-primary-foreground hover:opacity-90 transition",
              "disabled:opacity-60",
            )}
          >
            {checkoutLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isPro && state !== "expired" ? (
              "Ya tenés PRO"
            ) : isReactivation ? (
              "Reactivar PRO"
            ) : (
              "Hacerme PRO"
            )}
          </Button>
        </section>

        {/* Plan Free */}
        <section className="rounded-3xl bg-muted/40 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm">Plan gratuito</p>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tu plan actual</span>
          </div>
          <ul className="space-y-1.5">
            {FEATURES_FREE.map((f) => (
              <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                {f}
              </li>
            ))}
            <li className="flex items-center gap-2 text-xs text-muted-foreground line-through">
              <X className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
              Meta de ahorro mensual
            </li>
            <li className="flex items-center gap-2 text-xs text-muted-foreground line-through">
              <X className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
              Proyección de cierre
            </li>
          </ul>
        </section>

        <p className="text-center text-[11px] text-muted-foreground leading-relaxed px-2">
          Pago procesado de forma segura por Paddle (nuestro proveedor). Recibirás factura por email.
        </p>
      </div>
    </div>
  );
}
