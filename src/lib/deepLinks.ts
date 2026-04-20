// Deep link handler para Capacitor + Supabase magic link.
// Escucha cuando Android abre la app via miplata://auth?... y completa la sesión.
import { supabase } from "@/integrations/supabase/client";

export const APP_SCHEME = "miplata";
export const AUTH_REDIRECT_NATIVE = `${APP_SCHEME}://auth`;

/** True cuando la app corre dentro del wrapper nativo de Capacitor. */
export function isNativePlatform(): boolean {
  // Detección defensiva: si @capacitor/core no está disponible (build web puro), devolvemos false.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require("@capacitor/core");
    return Capacitor?.isNativePlatform?.() === true;
  } catch {
    return typeof (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor !== "undefined" &&
      (window as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor.isNativePlatform();
  }
}

/** URL a usar como emailRedirectTo según plataforma. */
export function authRedirectUrl(): string {
  return isNativePlatform() ? AUTH_REDIRECT_NATIVE : window.location.origin;
}

/**
 * Procesa una URL de deep link tipo:
 *   miplata://auth#access_token=...&refresh_token=...&type=magiclink
 * o   miplata://auth?code=... (PKCE)
 * Devuelve true si pudo establecer la sesión.
 */
export async function handleAuthDeepLink(url: string): Promise<boolean> {
  try {
    // Normalizamos: Supabase suele mandar tokens en el hash (#).
    const u = new URL(url);
    const hash = u.hash.startsWith("#") ? u.hash.slice(1) : u.hash;
    const hashParams = new URLSearchParams(hash);
    const queryParams = u.searchParams;

    const access_token = hashParams.get("access_token") ?? queryParams.get("access_token");
    const refresh_token = hashParams.get("refresh_token") ?? queryParams.get("refresh_token");
    const code = queryParams.get("code");

    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) throw error;
      return true;
    }

    if (code) {
      // Flujo PKCE
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return true;
    }

    return false;
  } catch (err) {
    console.error("[deepLinks] No se pudo procesar el link de auth:", err);
    return false;
  }
}

/**
 * Registra el listener appUrlOpen de Capacitor.
 * Llamar UNA sola vez al iniciar la app.
 */
export async function registerAuthDeepLinkListener(
  onAuthSuccess?: () => void,
): Promise<() => void> {
  if (!isNativePlatform()) return () => {};

  try {
    const { App } = await import("@capacitor/app");
    const handle = await App.addListener("appUrlOpen", async (event) => {
      if (!event?.url) return;
      if (!event.url.startsWith(`${APP_SCHEME}://`)) return;
      const ok = await handleAuthDeepLink(event.url);
      if (ok) onAuthSuccess?.();
    });
    return () => {
      handle.remove();
    };
  } catch (err) {
    console.error("[deepLinks] No se pudo registrar listener appUrlOpen:", err);
    return () => {};
  }
}
