import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().trim().email({ message: "Email no válido" }).max(255);

export default function Auth() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await signInWithEmail(parsed.data);
    setLoading(false);
    if (error) {
      toast.error("No se pudo enviar el enlace. Intentalo de nuevo.");
    } else {
      setSent(true);
      toast.success("¡Revisá tu email!");
    }
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
            Tu plata, bajo control. Simple y rápido.
          </p>
        </div>

        {sent ? (
          <div className="bg-card rounded-3xl p-6 shadow-card text-center">
            <p className="text-lg font-semibold mb-2">📬 Revisá tu email</p>
            <p className="text-sm text-muted-foreground">
              Te enviamos un enlace mágico a <span className="font-medium text-foreground">{email}</span>. Tocá el enlace para entrar.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
              {loading ? "Enviando..." : "Entrar con email"}
            </Button>
            <p className="text-xs text-muted-foreground text-center pt-2">
              Sin contraseñas. Te enviamos un enlace para entrar.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
