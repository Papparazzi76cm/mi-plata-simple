import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Wallet, Zap, Bell, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
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
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const Icon = steps[step].icon;
  const last = step === steps.length - 1;

  function next() {
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

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="h-24 w-24 rounded-3xl gradient-primary shadow-fab flex items-center justify-center mb-8 animate-slide-up">
          <Icon className="h-12 w-12 text-primary-foreground" strokeWidth={2.2} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight max-w-xs">{steps[step].title}</h1>
        <p className="text-muted-foreground mt-3 max-w-xs leading-relaxed">{steps[step].text}</p>
      </div>

      <div className="px-6 pb-10 space-y-6">
        <div className="flex justify-center gap-2">
          {steps.map((_, i) => (
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
