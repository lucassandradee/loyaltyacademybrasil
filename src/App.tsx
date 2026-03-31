import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Header from "@/components/Header";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import Index from "./pages/Index";
import Diagnostico from "./pages/Diagnostico";
import Cadastro from "./pages/Cadastro";
import Login from "./pages/Login";
import Resultado from "./pages/Resultado";
import Perfil from "./pages/Perfil";
import RFVUpload from "./pages/RFVUpload";
import RFVParametros from "./pages/RFVParametros";
import RFVDashboard from "./pages/RFVDashboard";
import NBOUpload from "./pages/NBOUpload";
import NBODashboard from "./pages/NBODashboard";
import CXUpload from "./pages/CXUpload";
import CXDashboard from "./pages/CXDashboard";
import PlanoFinal from "./pages/PlanoFinal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Header />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/diagnostico" element={<Diagnostico />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/login" element={<Login />} />

          {/* Authenticated routes with sidebar */}
          <Route element={<AuthenticatedLayout />}>
            <Route path="/resultado" element={<Resultado />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/rfv" element={<RFVUpload />} />
            <Route path="/rfv/parametros" element={<RFVParametros />} />
            <Route path="/rfv/dashboard" element={<RFVDashboard />} />
            <Route path="/nbo/dashboard" element={<NBODashboard />} />
            <Route path="/cx" element={<CXUpload />} />
            <Route path="/cx/dashboard" element={<CXDashboard />} />
            <Route path="/plano-final" element={<PlanoFinal />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
