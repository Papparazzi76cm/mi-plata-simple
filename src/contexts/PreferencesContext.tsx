import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  detectCountry,
  findCountry,
  type CountryInfo,
} from "@/lib/locales";
import { getCurrentCountry, setCurrentCountry, subscribe } from "@/lib/currencyStore";

interface PreferencesContextValue {
  country: CountryInfo;
  countries: CountryInfo[];
  setCountry: (code: string) => Promise<void>;
  loading: boolean;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [country, setCountryState] = useState<CountryInfo>(getCurrentCountry());
  const [loading, setLoading] = useState(true);

  // Sync con el store global → re-render cuando cambia.
  useEffect(() => {
    return subscribe(() => setCountryState(getCurrentCountry()));
  }, []);

  // Cargar preferencias del usuario desde Supabase al iniciar.
  useEffect(() => {
    let active = true;
    async function load() {
      if (!user) {
        // Sin sesión: si nunca se eligió, intentamos detectar.
        try {
          const saved = localStorage.getItem("miplata.country.v1");
          if (!saved) setCurrentCountry(detectCountry());
        } catch {
          /* noop */
        }
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("user_preferences")
        .select("country_code")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (!error && data?.country_code) {
        setCurrentCountry(findCountry(data.country_code));
      } else {
        // Primer login: usamos lo que ya tenemos (localStorage o detect).
        const local = getCurrentCountry();
        if (local.code === DEFAULT_COUNTRY.code) {
          const detected = detectCountry();
          setCurrentCountry(detected);
        }
      }
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [user]);

  const setCountry = useCallback(
    async (code: string) => {
      const next = findCountry(code);
      setCurrentCountry(next);
      if (user) {
        await supabase
          .from("user_preferences")
          .upsert(
            { user_id: user.id, country_code: next.code },
            { onConflict: "user_id" },
          );
      }
    },
    [user],
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({ country, countries: COUNTRIES, setCountry, loading }),
    [country, setCountry, loading],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used inside PreferencesProvider");
  return ctx;
}
