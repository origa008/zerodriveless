
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, UserPlus, LogIn, UserRound, CarFront, Bike } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  
  // Redirect to main page if user is already authenticated
  useEffect(() => {
    if (!isLoading && user?.isLoggedIn) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);
  
  // Show loading skeleton during auth check
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-700"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col justify-between p-6 bg-gradient-to-br from-violet-200 to-purple-100">
      <div className="mt-8 text-center md:text-left">
        <p className="md:text-5xl font-medium text-black mt-4 leading-tight text-left text-4xl">
          You ride, you decide, <br />
          we charge <span className="text-violet-700">Zero</span> commission
        </p>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-3 gap-6">
          <div className="flex flex-col items-center">
            <UserRound size={48} className="mb-2 text-violet-700" />
            <span className="text-sm">Rider</span>
          </div>
          <div className="flex flex-col items-center">
            <CarFront size={48} className="mb-2 text-violet-700" />
            <span className="text-sm">Auto</span>
          </div>
          <div className="flex flex-col items-center">
            <Bike size={48} className="mb-2 text-violet-700" />
            <span className="text-sm">Bike</span>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Button 
          onClick={() => navigate('/signup')} 
          className="flex-1 bg-violet-700 hover:bg-violet-800 text-white rounded-2xl text-xl py-[30px]"
        >
          Register <UserPlus className="ml-2" />
        </Button>
        
        <Button 
          onClick={() => navigate('/login')} 
          className="flex-1 bg-black text-white hover:bg-gray-800 rounded-2xl text-xl py-[30px] px-[38px]"
        >
          Login <LogIn className="ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default Welcome;
