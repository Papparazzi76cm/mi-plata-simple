import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.miplata',
  appName: 'mi-plata-simple',
  webDir: 'dist',
  // Hot-reload desde el sandbox de Lovable durante desarrollo.
  // Cuando publiques a Play Store, comentá el bloque "server" para que use el bundle local.
  server: {
    url: 'https://160c00d1-3c2d-4519-9bdc-c64ab52fc191.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
