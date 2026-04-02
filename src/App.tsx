import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import InadimplentesPage from "@/pages/InadimplentesPage";
import RecuperacoesPage from "@/pages/RecuperacoesPage";
import CadastrarPage from "@/pages/CadastrarPage";
import AtividadesPage from "@/pages/AtividadesPage";
import EvolucaoPage from "@/pages/EvolucaoPage";
import PremissasPage from "@/pages/PremissasPage";
import ImportacaoPage from "@/pages/ImportacaoPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/inadimplentes" element={<InadimplentesPage />} />
            <Route path="/recuperacoes" element={<RecuperacoesPage />} />
            <Route path="/evolucao" element={<EvolucaoPage />} />
            <Route path="/atividades" element={<AtividadesPage />} />
            <Route path="/cadastrar" element={<CadastrarPage />} />
            <Route path="/importacao" element={<ImportacaoPage />} />
            <Route path="/premissas" element={<PremissasPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;