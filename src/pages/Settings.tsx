import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { usePreferences } from "@/contexts/PreferencesContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, LogOut, Trash2, ChevronRight, Sparkles, Cloud, Crown, Target, Globe, Check } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { user, signOut } = useAuth();
  const { isPro, state, subscription } = useSubscription();

  async function handleExport() {
    const [tx, rem] = await Promise.all([
      supabase.from("transactions").select("*").order("date", { ascending: false }),
      supabase.from("reminders").select("*").order("due_date", { ascending: true }),
    ]);
    const data = { transactions: tx.data ?? [], reminders: rem.data ?? [], exported_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mi-plata-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Datos exportados");
  }

  async function handleDeleteAll() {
    const [t, r] = await Promise.all([
      supabase.from("transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      supabase.from("reminders").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
    ]);
    if (t.error || r.error) {
      toast.error("No se pudo borrar todo");
      return;
    }
    toast.success("Todos tus datos fueron eliminados");
    await signOut();
  }

  return (
    <div className="px-5 pt-10">
      <header className="mb-6">
        <p className="text-muted-foreground text-sm">Tu cuenta</p>
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
      </header>

      {/* Account card */}
      <section className="bg-card rounded-3xl p-5 shadow-soft mb-5 flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground font-bold">
          {user?.email?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Conectado como</p>
          <p className="font-medium truncate">{user?.email ?? "—"}</p>
        </div>
      </section>

      {/* PRO card / upgrade */}
      <Link
        to="/upgrade"
        className="block rounded-3xl p-5 shadow-card mb-5 active:scale-[0.99] transition-transform gradient-card text-primary-foreground"
      >
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Crown className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            {isPro ? (
              <>
                <p className="text-xs uppercase tracking-wider opacity-85 font-semibold">Mi Plata PRO</p>
                <p className="font-bold mt-0.5">
                  {state === "canceled" ? "Activa hasta fin de período" : "Suscripción activa"}
                </p>
                {subscription?.current_period_end && (
                  <p className="text-[11px] opacity-80 mt-0.5">
                    Renueva el{" "}
                    {new Date(subscription.current_period_end).toLocaleDateString("es-PY", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-xs uppercase tracking-wider opacity-85 font-semibold">Hacete PRO</p>
                <p className="font-bold mt-0.5">Desbloqueá meta de ahorro y proyecciones</p>
                <p className="text-[11px] opacity-80 mt-0.5">Desde $2,99/mes · cancelá cuando quieras</p>
              </>
            )}
          </div>
          <ChevronRight className="h-5 w-5 opacity-80" />
        </div>
      </Link>

      <ul className="bg-card rounded-3xl shadow-soft overflow-hidden divide-y divide-border mb-5">
        <li className="flex items-center gap-4 px-5 py-4">
          <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center text-accent-foreground">
            <DollarSign className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Moneda</p>
            <p className="text-xs text-muted-foreground">Guaraní paraguayo</p>
          </div>
          <span className="text-sm font-semibold text-primary">Gs</span>
        </li>
        <li>
          <Link
            to="/budgets"
            className="w-full flex items-center gap-4 px-5 py-4 active:bg-muted transition-colors"
          >
            <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center text-accent-foreground">
              <Target className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">Presupuestos</p>
              <p className="text-xs text-muted-foreground">Definí tus límites por categoría</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </li>
        <li>
          <button
            onClick={handleExport}
            className="w-full flex items-center gap-4 px-5 py-4 active:bg-muted transition-colors"
          >
            <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center text-accent-foreground">
              <Download className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">Exportar datos</p>
              <p className="text-xs text-muted-foreground">Descarga un archivo JSON</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </li>
        <li>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-4 px-5 py-4 active:bg-muted transition-colors"
          >
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
              <LogOut className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">Cerrar sesión</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </li>
      </ul>

      {/* Próximamente */}
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
        Próximamente
      </p>
      <ul className="bg-card rounded-3xl shadow-soft overflow-hidden divide-y divide-border mb-6">
        {[
          { icon: Sparkles, title: "Insights avanzados", text: "Tendencias profundas y consejos personalizados" },
          { icon: Cloud, title: "Backup en la nube", text: "Tus datos siempre seguros" },
        ].map((item) => (
          <li key={item.title} className="flex items-center gap-4 px-5 py-4 opacity-70">
            <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center text-accent-foreground">
              <item.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.text}</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-accent text-accent-foreground uppercase tracking-wide">
              Pronto
            </span>
          </li>
        ))}
      </ul>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            className="w-full h-14 rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive font-semibold"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar todos mis datos
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar todos los datos?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto borrará todos tus movimientos y recordatorios. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="rounded-xl bg-destructive hover:bg-destructive/90"
            >
              Sí, eliminar todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p className="text-center text-xs text-muted-foreground mt-8">Mi Plata · v1.0</p>
    </div>
  );
}
