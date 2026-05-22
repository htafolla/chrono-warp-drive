import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import About from "./pages/About";
import IsotopicVortex from "./pages/IsotopicVortex";
import DynamoDeploy from "./pages/DynamoDeploy";
import NotFound from "./pages/NotFound";

// Simple consumer site (dynamo-ui) should show the lightweight beacon dashboard as root
const isSimpleConsumer = typeof window !== 'undefined' &&
  window.location.hostname.includes('dynamo-ui');

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
