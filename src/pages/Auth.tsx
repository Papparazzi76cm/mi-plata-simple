import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Wallet, ArrowLeft } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().trim().email({ message: "Email no válido" }).max(255);

export default function Auth() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    // signInWithOtp manda email con código de 6 dígitos Y magic link.
    // El usuario puede usar cualquiera de los dos. Acá usamos el código.
    const { error } = await signInWithEmail(parsed.data);
    setLoading(false);
    if (error) {
      toast.error("No se pudo enviar el código. Intentalo de nuevo.");
    } else {
      setStep("code");
      toast.success("Código enviado a tu email");
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error("Ingresá los 6 dígitos");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setLoading(false);
    if (error) {
      toast.error("Código inválido o expirado");
      setCode("");
    } else {
      toast.success("¡Bienvenido!");
    }
  }

  async function handleResend() {
    setLoading(true);
    const { error } = await signInWithEmail(email);
    setLoading(false);
    if (error) {
      toast.error("No se pudo reenviar el código");
    } else {
      toast.success("Código reenviado");
      setCode("");
    }
  }

  function handleBack() {
    setStep("email");
    setCode("");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex flex-col items-center mb-10">
          <div className="h-20 w-20 rounded-3xl gradient-primary shadow-fab flex items-center justify-center mb-5">
            <Wallet className="h-10 w-10 text-primary-foreground" strokeWidth={2.2} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Mi Plata</h1>
          <p className="text-muted-foreground mt-2 text-center">
            Tu coach financiero diario.<br />Simple, real y en tu bolsillo.
          </p>
        </div>

        {step === "email" ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 text-base rounded-2xl px-5 bg-card"
              required
            />
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 text-base font-semibold rounded-2xl gradient-primary shadow-fab hover:opacity-95"
            >
              {loading ? "Enviando..." : "Enviar código"}
            </Button>
            <p className="text-xs text-muted-foreground text-center pt-2">
              Te enviamos un código de 6 dígitos a tu email.
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-5">
            <div className="bg-card rounded-3xl p-6 shadow-card">
              <p className="text-sm text-muted-foreground text-center mb-1">
                Ingresá el código que enviamos a
              </p>
              <p className="text-sm font-medium text-foreground text-center mb-5 break-all">
                {email}
              </p>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  autoFocus
                  inputMode="numeric"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full h-14 text-base font-semibold rounded-2xl gradient-primary shadow-fab hover:opacity-95"
            >
              {loading ? "Verificando..." : "Entrar"}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleBack}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Cambiar email
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="text-primary font-medium hover:underline disabled:opacity-50"
              >
                Reenviar código
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
