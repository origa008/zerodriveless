
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, Car, DollarSign, Users } from 'lucide-react';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex flex-col justify-between p-6 bg-violet-200">
      <div className="mt-8">
        <h1 className="text-5xl font-bold text-black mb-4">ZeroDrive</h1>
        <p className="mt-4 font-medium text-4xl text-black">You ride, you decide, we charge Zero commission</p>
        
        <div className="mt-12 space-y-6">
          <div className="flex items-center">
            <div className="bg-white p-3 rounded-full mr-4">
              <MapPin size={24} className="text-violet-600" />
            </div>
            <p className="text-lg font-medium">Book rides anywhere in the city</p>
          </div>
          
          <div className="flex items-center">
            <div className="bg-white p-3 rounded-full mr-4">
              <Car size={24} className="text-violet-600" />
            </div>
            <p className="text-lg font-medium">Drive and earn with zero commission</p>
          </div>
          
          <div className="flex items-center">
            <div className="bg-white p-3 rounded-full mr-4">
              <DollarSign size={24} className="text-violet-600" />
            </div>
            <p className="text-lg font-medium">You set the price, negotiate directly</p>
          </div>
          
          <div className="flex items-center">
            <div className="bg-white p-3 rounded-full mr-4">
              <Users size={24} className="text-violet-600" />
            </div>
            <p className="text-lg font-medium">Refer friends and earn rewards</p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-8">
        <Button 
          onClick={() => navigate('/signup')} 
          className="bg-violet-600 text-white hover:bg-violet-700 rounded-2xl text-xl py-[30px] px-[38px] text-left"
        >
          Sign Up
        </Button>
        
        <Button 
          onClick={() => navigate('/login')} 
          className="bg-black text-white hover:bg-gray-800 rounded-2xl text-xl py-[30px] px-[38px] text-left"
        >
          Login
        </Button>
      </div>
    </div>
  );
};

export default Welcome;
