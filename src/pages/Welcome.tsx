
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Welcome: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between p-6">
      <div className="mt-8">
        <h1 className="text-5xl font-bold text-black">Zerodrive</h1>
        <p className="text-xl text-gray-600 mt-4">The easiest way to get a ride</p>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md h-80 bg-zerodrive-purple/20 rounded-3xl flex items-center justify-center">
          <div className="text-center p-6">
            <h2 className="text-3xl font-bold mb-4">Welcome to Zerodrive</h2>
            <p className="text-lg text-gray-700">
              Your premium ride-hailing service. Safe, convenient, and affordable.
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end mt-8">
        <Button 
          className="bg-black text-white hover:bg-gray-800 px-8 py-6 text-xl rounded-2xl"
          onClick={() => navigate('/login')}
        >
          Login
        </Button>
      </div>
    </div>
  );
};

export default Welcome;
