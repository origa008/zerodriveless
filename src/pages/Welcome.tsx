import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, UserPlus, LogIn, UserRound, CarFront, Bike } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  // Handle authentication state
  useEffect(() => {
    const checkAuth = async () => {
      if (!isLoading) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            // User is already logged in, redirect to main page
            navigate('/');
          }
        } catch (error) {
          console.error('Error checking auth:', error);
          toast({
            title: 'Error',
            description: 'Failed to check authentication status',
            variant: 'destructive'
          });
        }
      }
    };

    checkAuth();
  }, [isLoading, navigate]);

  // Show loading skeleton during auth check
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-700"></div>
      </div>;
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
        <div className="text-center">
          <p className="text-xl text-gray-700 mb-4">
            Join our community of riders and drivers
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
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
      </div>
    </div>
  );
};
export default Welcome;