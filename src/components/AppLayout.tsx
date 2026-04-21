import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { PaymentTestModeBanner } from "./PaymentTestModeBanner";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="mx-auto max-w-md min-h-screen pb-28">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
