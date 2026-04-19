import { NavLink, useLocation } from "react-router-dom";
import { Home, Bell, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const location = useLocation();
  const hide = location.pathname === "/auth" || location.pathname === "/add";
  if (hide) return null;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-colors",
      isActive ? "text-primary" : "text-muted-foreground",
    );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom pointer-events-none">
      <div className="mx-auto max-w-md relative pointer-events-auto">
        {/* Floating Add Button */}
        <NavLink
          to="/add"
          aria-label="Añadir movimiento"
          className="absolute left-1/2 -translate-x-1/2 -top-7 h-16 w-16 rounded-full gradient-primary shadow-fab flex items-center justify-center text-primary-foreground active:scale-95 transition-transform"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </NavLink>

        <div className="bg-card/95 backdrop-blur-lg border-t border-border px-2 pt-2 pb-3 flex items-center justify-around">
          <NavLink to="/" end className={cn(linkClass({ isActive: location.pathname === "/" }), "flex-1 max-w-[80px]")}>
            <Home className="h-5 w-5" strokeWidth={2.2} />
            <span className="text-[10px] font-medium">Inicio</span>
          </NavLink>

          {/* Spacer for FAB */}
          <div className="w-20 shrink-0" aria-hidden />

          <NavLink to="/reminders" className={cn(linkClass({ isActive: location.pathname === "/reminders" }), "flex-1 max-w-[80px]")}>
            <Bell className="h-5 w-5" strokeWidth={2.2} />
            <span className="text-[10px] font-medium">Avisos</span>
          </NavLink>

          <NavLink to="/settings" className={cn(linkClass({ isActive: location.pathname === "/settings" }), "flex-1 max-w-[80px]")}>
            <Settings className="h-5 w-5" strokeWidth={2.2} />
            <span className="text-[10px] font-medium">Ajustes</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
