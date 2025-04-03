
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/lib/context/AuthContext';
import { RideProvider } from '@/lib/context/RideContext';
import { Toaster } from '@/components/ui/toaster';

// Pages
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Profile from '@/pages/Profile';
import Welcome from '@/pages/Welcome';
import Community from '@/pages/Community';
import History from '@/pages/History';
import Wallet from '@/pages/Wallet';
import OfficialDriver from '@/pages/OfficialDriver';
import AboutUs from '@/pages/AboutUs';
import NotFound from '@/pages/NotFound';
import RideProgress from '@/pages/RideProgress';
import RideCompleted from '@/pages/RideCompleted';
import Offers from '@/pages/Offers';
import Partners from '@/pages/Partners';
import Policies from '@/pages/Policies';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

function App() {
  return (
    <Router>
      <AuthProvider>
        <RideProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/community" element={<Community />} />
            <Route path="/history" element={<History />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/official-driver" element={<OfficialDriver />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/ride-progress" element={<RideProgress />} />
            <Route path="/ride-completed" element={<RideCompleted />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </RideProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
