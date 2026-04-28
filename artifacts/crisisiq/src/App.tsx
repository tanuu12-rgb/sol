import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

// Pages
import Landing from "./pages/landing";
import Login from "./pages/login";
import Checkin from "./pages/checkin";
import GuestChoice from "./pages/guest-choice";
import GuestSignin from "./pages/guest-signin";
import GuestPortal from "./pages/guest";
import Dashboard from "./pages/dashboard";
import StaffView from "./pages/staff";
import SurveyPage from "./pages/survey-page";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/checkin" component={GuestChoice} />
      <Route path="/checkin/register" component={Checkin} />
      <Route path="/checkin/signin" component={GuestSignin} />
      <Route path="/guest" component={GuestPortal} />
      <Route path="/guest/survey" component={SurveyPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/staff" component={StaffView} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
