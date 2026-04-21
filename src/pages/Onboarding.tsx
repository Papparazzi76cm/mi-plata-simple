import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Wallet, Zap, Bell, ChevronRight, Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/contexts/PreferencesContext";

const intros = [
  {
    icon: Wallet,
    title: "Tu coach financiero diario",
    text: "Mi Plata no es solo una app de gastos — te ayuda a entender tu plata y mejorar día a día.",
  },
  {
    icon: Zap,
    title: "Anotá rápido, entendé al instante",
    text: "Escribí “20000 comida” y listo. Tu coach analiza tus patrones y te habla con datos reales.",
  },
  {
    icon: Bell,
    title: "Patrones, alertas y consejos reales",
    text: "Vas a ver cuándo gastás de más, qué categoría se te va de control y cómo cerrarías el mes.",
  },
];

export const ONBOARDING_KEY = "miplata.onboarded.v1";

export default function Onboarding() {
  const navigate = useNavigate();
  const { country, countries, setCountry } = usePreferences();
  const [step, setStep] = useState(0);

  const totalSteps = intros.length + 1; // +1 para el paso del país
  const isCountryStep = step === intros.length;
  const last = step === totalSteps - 1;

  async function next() {
    if (last) {
      localStorage.setItem(ONBOARDING_KEY, "1");
      navigate("/", { replace: true });
    } else {
      setStep((s) => s + 1);
    }
  }

  function skip() {
    localStorage.setItem(ONBOARDING_KEY, "1");
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex justify-end px-5 pt-5">
        {!last && (
          <button
            onClick={skip}
            className="text-sm text-muted-foreground font-medium px-3 py-1.5"
          >
            Saltar
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center px-6 text-center pt-4">
        {!isCountryStep ? (
          <>
            <div className="h-24 w-24 rounded-3xl gradient-primary shadow-fab flex items-center justify-center mb-8 animate-slide-up">
              {(() => {
                const Icon = intros[step].icon;
                return <Icon className="h-12 w-12 text-primary-foreground" strokeWidth={2.2} />;
              })()}
            </div>
            <h1 className="text-2xl font-bold tracking-tight max-w-xs">{intros[step].title}</h1>
            <p className="text-muted-foreground mt-3 max-w-xs leading-relaxed">{intros[step].text}</p>
          </>
        ) : (
          <div className="w-full max-w-md flex flex-col items-center animate-slide-up">
            <div className="h-20 w-20 rounded-3xl gradient-primary shadow-fab flex items-center justify-center mb-6">
              <Globe className="h-10 w-10 text-primary-foreground" strokeWidth={2.2} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">¿Dónde vivís?</h1>
            <p className="text-muted-foreground mt-2 mb-6 max-w-xs leading-relaxed">
              Lo usamos para mostrar los montos en tu moneda. Podés cambiarlo después.
            </p>

            <ul className="w-full bg-card rounded-3xl shadow-soft overflow-hidden divide-y divide-border max-h-[55vh] overflow-y-auto text-left">
              {countries.map((c) => {
                const selected = c.code === country.code;
                return (
                  <li key={c.code}>
                    <button
                      type="button"
                      onClick={() => setCountry(c.code)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 active:bg-muted transition-colors",
                        selected && "bg-primary/5",
                      )}
                    >
                      <span className="text-2xl leading-none">{c.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">{c.currency}</p>
                      </div>
                      {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="px-6 pb-10 pt-6 space-y-6">
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 rounded-full transition-all",
                i === step ? "w-8 bg-primary" : "w-2 bg-muted",
              )}
            />
          ))}
        </div>
        <Button
          onClick={next}
          className="w-full h-14 text-base font-semibold rounded-2xl gradient-primary shadow-fab"
        >
          {last ? "Empezar" : "Siguiente"}
          <ChevronRight className="h-5 w-5 ml-1" />
        </Button>
      </div>
    </div>
  );
}
