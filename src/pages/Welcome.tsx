
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, UserPlus, LogIn } from 'lucide-react';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex flex-col justify-between p-6 bg-gradient-to-br from-violet-200 to-purple-100">
      <div className="mt-8 text-center md:text-left">
        <h1 className="text-4xl md:text-6xl font-bold text-black mb-2">ZeroDrive</h1>
        <p className="text-3xl md:text-5xl font-medium text-black mt-4 leading-tight">
          You ride, you decide, <br/>
          we charge <span className="text-violet-700">Zero</span> commission
        </p>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <div className="rounded-2xl bg-white/60 backdrop-blur p-8 shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6 text-center">Join our community today</h2>
          <div className="space-y-4">
            <div className="bg-white/70 rounded-lg p-4">
              <h3 className="font-medium">For Riders</h3>
              <p className="text-sm text-gray-600">Find affordable rides with zero commission fees.</p>
            </div>
            
            <div className="bg-white/70 rounded-lg p-4">
              <h3 className="font-medium">For Drivers</h3>
              <p className="text-sm text-gray-600">Earn more with our zero commission policy.</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Button 
          onClick={() => navigate('/signup')} 
          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-xl py-[30px] px-[38px]"
        >
          Sign Up <UserPlus className="ml-2" />
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
