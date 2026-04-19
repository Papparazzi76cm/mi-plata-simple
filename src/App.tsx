import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AddTransaction from "./pages/AddTransaction";
import Reminders from "./pages/Reminders";
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";
import Budgets from "./pages/Budgets";
import CategoryDetail from "./pages/CategoryDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-center" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/onboarding"
              element={
                <RequireAuth>
                  <Onboarding />
                </RequireAuth>
              }
            />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <AppLayout>
                    <Index />
                  </AppLayout>
                </RequireAuth>
              }
            />
            <Route
              path="/add"
              element={
                <RequireAuth>
                  <AddTransaction />
                </RequireAuth>
              }
            />
            <Route
              path="/reminders"
              element={
                <RequireAuth>
                  <AppLayout>
                    <Reminders />
                  </AppLayout>
                </RequireAuth>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
