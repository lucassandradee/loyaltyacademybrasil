import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Header from "@/components/Header";
import Index from "./pages/Index";
import Diagnostico from "./pages/Diagnostico";
import Resultado from "./pages/Resultado";
import RFVUpload from "./pages/RFVUpload";
import RFVParametros from "./pages/RFVParametros";
import RFVDashboard from "./pages/RFVDashboard";
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
          <Route path="/" element={<Index />} />
          <Route path="/diagnostico" element={<Diagnostico />} />
          <Route path="/resultado" element={<Resultado />} />
          <Route path="/rfv" element={<RFVUpload />} />
          <Route path="/rfv/parametros" element={<RFVParametros />} />
          <Route path="/rfv/dashboard" element={<RFVDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
