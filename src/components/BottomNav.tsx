import { NavLink, useLocation } from "react-router-dom";
import { Home, Bell, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", icon: Home, label: "Inicio" },
  { to: "/reminders", icon: Bell, label: "Recordatorios" },
  { to: "/settings", icon: Settings, label: "Ajustes" },
];

export function BottomNav() {
  const location = useLocation();
  const hide = location.pathname === "/auth" || location.pathname === "/add";

  if (hide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom">
      <div className="mx-auto max-w-md relative">
        {/* Floating Add Button */}
        <NavLink
          to="/add"
          aria-label="Añadir movimiento"
          className="absolute left-1/2 -translate-x-1/2 -top-7 h-16 w-16 rounded-full gradient-primary shadow-fab flex items-center justify-center text-primary-foreground active:scale-95 transition-transform"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </NavLink>

        <div className="bg-card/95 backdrop-blur-lg border-t border-border px-2 pt-2 pb-3 grid grid-cols-3 gap-1">
          {items.map((item, idx) => {
            // insert spacer in middle
            const showSpacer = idx === 1;
            return (
              <div key={item.to} className="contents">
                {showSpacer && <div className="hidden" />}
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center gap-1 py-2 rounded-xl transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground",
                      idx === 1 && "col-start-3", // push reminders right
                    )
                  }
                  style={idx === 0 ? { gridColumnStart: 1 } : undefined}
                >
                  <item.icon className="h-5 w-5" strokeWidth={2.2} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </NavLink>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
