import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PixelInjector from "@/components/PixelInjector";
import ToolSelector from "./pages/ToolSelector";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import MROFerramenta from "./pages/MROFerramenta";
import VendasCompleta from "./pages/VendasCompleta";
import InstagramNovaAdmin from "./pages/InstagramNovaAdmin";
import InstagramNovaAdminEmail from "./pages/InstagramNovaAdminEmail";
import InstagramNovaPromoo2 from "./pages/InstagramNovaPromoo2";
import DescontoAlunosRendaExtra from "./pages/DescontoAlunosRendaExtra";
import AffiliatePromoPage from "./pages/AffiliatePromoPage";
import AffiliateResumo from "./pages/AffiliateResumo";
import Obrigado from "./pages/Obrigado";
import AdminUsuario from "./pages/AdminUsuario";
import PoliticaCancelamento from "./pages/PoliticaCancelamento";
import WhatsAppLanding from "./pages/WhatsAppLanding";
import RateLimitHard from "./pages/RateLimitHard";
import EstruturaRendaExtra from "./pages/EstruturaRendaExtra";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PixelInjector />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<VendasCompleta />} />
          <Route path="/ferramentas" element={<ToolSelector />} />
          <Route path="/instagram" element={<Index />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/mro-ferramenta" element={<MROFerramenta />} />
          <Route path="/instagram-nova" element={<VendasCompleta />} />
          <Route path="/instagram-nova-admin" element={<InstagramNovaAdmin />} />
          <Route path="/instagram-nova-admin/email" element={<InstagramNovaAdminEmail />} />
          <Route path="/instagram-nova-promoo2" element={<InstagramNovaPromoo2 />} />
          <Route path="/promo/:affiliateId" element={<AffiliatePromoPage />} />
          <Route path="/resumo/:affiliateId" element={<AffiliateResumo />} />
          <Route path="/obrigado" element={<Obrigado />} />
          <Route path="/adminusuario" element={<AdminUsuario />} />
          <Route path="/politica-de-cancelamento" element={<PoliticaCancelamento />} />
          <Route path="/whatsapp" element={<WhatsAppLanding />} />
          <Route path="/RateLimitHard" element={<RateLimitHard />} />
          <Route path="/descontoalunosrendaextra" element={<DescontoAlunosRendaExtra />} />
          <Route path="/estruturarendaextra" element={<EstruturaRendaExtra />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
