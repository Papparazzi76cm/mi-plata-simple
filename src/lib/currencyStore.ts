// Store ligero (singleton) con la preferencia de moneda activa.
// Lo escribe el PreferencesProvider y lo lee `formatGs` para que
// todos los lugares que ya usan formatGs cambien sin refactor.

import { DEFAULT_COUNTRY, findCountry, type CountryInfo } from "./locales";

const STORAGE_KEY = "miplata.country.v1";

let current: CountryInfo = (() => {
  try {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return saved ? findCountry(saved) : DEFAULT_COUNTRY;
  } catch {
    return DEFAULT_COUNTRY;
  }
})();

const listeners = new Set<() => void>();

export function getCurrentCountry(): CountryInfo {
  return current;
}

export function setCurrentCountry(country: CountryInfo) {
  if (current.code === country.code) return;
  current = country;
  try {
    localStorage.setItem(STORAGE_KEY, country.code);
  } catch {
    /* noop */
  }
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
