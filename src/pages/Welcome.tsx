import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
const Welcome: React.FC = () => {
  const navigate = useNavigate();
  return <div className="min-h-screen flex flex-col justify-between p-6 bg-violet-200">
      <div className="mt-8">
        
        <p className="mt-4 font-medium text-5xl text-black">You ride you decide we charge Zero commission</p>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        
      </div>
      
      <div className="flex justify-end mt-8">
        <Button onClick={() => navigate('/login')} className="bg-black text-white hover:bg-gray-800 rounded-2xl text-xl py-[30px] px-[38px] text-left">
          Login
        </Button>
      </div>
    </div>;
};
export default Welcome;