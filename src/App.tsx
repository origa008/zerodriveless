
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/context/AuthContext";
import { RideProvider } from "@/lib/context/RideContext";

// Pages
import Index from "./pages/Index";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import RideProgress from "./pages/RideProgress";
import RideCompleted from "./pages/RideCompleted";
import Community from "./pages/Community";
import Offers from "./pages/Offers";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";
import History from "./pages/History";
import Partners from "./pages/Partners";
import AboutUs from "./pages/AboutUs";
import Policies from "./pages/Policies";
import OfficialDriver from "./pages/OfficialDriver";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <RideProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/ride-progress" element={<RideProgress />} />
            <Route path="/ride-completed" element={<RideCompleted />} />
            <Route path="/community" element={<Community />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/history" element={<History />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/official-driver" element={<OfficialDriver />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RideProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
