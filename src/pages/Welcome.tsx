import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, UserPlus, LogIn } from 'lucide-react';
const Welcome: React.FC = () => {
  const navigate = useNavigate();
  return <div className="min-h-screen flex flex-col justify-between p-6 bg-gradient-to-br from-violet-200 to-purple-100">
      <div className="mt-8 text-center md:text-left">
        
        <p className="md:text-5xl font-medium text-black mt-4 leading-tight text-left text-4xl">
          You ride, you decide, <br />
          we charge <span className="text-violet-700">Zero</span> commission
        </p>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        
        
        <Button onClick={() => navigate('/login')} className="flex-1 bg-black text-white hover:bg-gray-800 rounded-2xl text-xl py-[30px] px-[38px]">
          Login <LogIn className="ml-2" />
        </Button>
      </div>
    </div>;
};
export default Welcome;