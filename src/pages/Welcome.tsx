
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Welcome: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 bg-violet-200 relative overflow-hidden">
      {/* Logo and Header */}
      <div className="mt-8 relative z-10">
        <h1 className="text-4xl font-bold mb-2">ZeroDrive</h1>
        <p className="mt-4 font-medium text-5xl text-black">You ride you decide we charge Zero commission</p>
      </div>
      
      {/* Background illustration */}
      <div className="flex-1 flex items-center justify-center relative z-0">
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <div className="w-64 h-64 rounded-full bg-purple-500 absolute" style={{ top: '10%', left: '20%' }}></div>
          <div className="w-48 h-48 rounded-full bg-indigo-500 absolute" style={{ bottom: '15%', right: '15%' }}></div>
        </div>
      </div>
      
      {/* Login and Signup buttons */}
      <div className="flex flex-col mt-8 relative z-10 space-y-3">
        <Button 
          onClick={() => navigate('/login')} 
          className="bg-black text-white hover:bg-gray-800 rounded-2xl text-xl py-[30px] w-full"
        >
          Login
        </Button>
        <Button 
          onClick={() => navigate('/signup')} 
          variant="outline"
          className="bg-white text-black hover:bg-gray-100 rounded-2xl text-xl py-[30px] border-black w-full"
        >
          Sign Up
        </Button>
      </div>
    </div>
  );
};

export default Welcome;
