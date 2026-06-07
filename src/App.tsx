import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Web3Providers } from "@/providers/Web3Providers";
import Index from "./pages/Index";
import About from "./pages/About";
import IsotopicVortex from "./pages/IsotopicVortex";
import DynamoDeploy from "./pages/DynamoDeploy";
import TPTTPage from "./pages/TPTTPage";
import VortexClaim from "./pages/VortexClaim";
import NotFound from "./pages/NotFound";

const isSimpleConsumer = typeof window !== 'undefined' &&
  (window.location.hostname.includes('dynamo-ui') || window.location.hostname.includes('rippel.ai'));

const App = () => (
  <Web3Providers>
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={isSimpleConsumer ? <DynamoDeploy /> : <Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/isotopic-vortex" element={<IsotopicVortex />} />
            <Route path="/deploy" element={<DynamoDeploy />} />
            <Route path="/tptt" element={<TPTTPage />} />
            <Route path="/vortex" element={<VortexClaim />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </Web3Providers>
);

export default App;
