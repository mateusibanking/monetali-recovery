import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import InadimplentesPage from "@/pages/InadimplentesPage";
import RecuperacoesPage from "@/pages/RecuperacoesPage";
import CadastrarPage from "@/pages/CadastrarPage";
import AtividadesPage from "@/pages/AtividadesPage";
import EvolucaoPage from "@/pages/EvolucaoPage";
import PremissasPage from "@/pages/PremissasPage";
import ImportacaoPage from "@/pages/ImportacaoPage";
import DashboardFinanceiro from "@/pages/DashboardFinanceiro";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/inadimplentes" element={<InadimplentesPage />} />
              <Route path="/recuperacoes" element={<RecuperacoesPage />} />
              <Route path="/evolucao" element={<EvolucaoPage />} />
              <Route path="/atividades" element={<AtividadesPage />} />
              <Route path="/cadastrar" element={<CadastrarPage />} />
              <Route path="/importacao" element={<ImportacaoPage />} />
              <Route path="/premissas" element={<PremissasPage />} />
              <Route path="/dashboard-financeiro" element={<DashboardFinanceiro />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;