/* TraceFlow / Vector Atelier: router principal que mantiene todas las páginas accesibles desde un layout coherente. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import BackgroundRemover from "@/pages/BackgroundRemover";
import History from "@/pages/History";
import Home from "@/pages/Home";
import Workspace from "@/pages/Workspace";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/workspace" component={Workspace} />
      <Route path="/background-remover" component={BackgroundRemover} />
      <Route path="/history" component={History} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
