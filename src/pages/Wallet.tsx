import React from 'react';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { CreditCard, DollarSign, Building, Clock } from 'lucide-react';
const Wallet: React.FC = () => {
  return <div className="min-h-screen bg-white p-6 pb-20">
      <h1 className="text-3xl font-bold mb-6">Wallet</h1>
      
      <div className="bg-black text-white p-6 rounded-2xl mb-6 py-[34px] px-[20px]">
        <p className="text-gray-300 mb-1">Available Balance</p>
        <h2 className="text-3xl font-bold mb-4">RS 1,250</h2>
        <Button className="bg-white text-black hover:bg-gray-100">
          Add Money
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        
        
        
        
        
        
        
      </div>
      
      <h2 className="mb-4 text-4xl font-normal">Spendings</h2>
      
      <div className="space-y-4 bg-transparent my-[20px]">
        <div className="border-b border-gray-100 pb-4">
          <div className="flex justify-between py-[15px]">
            <div>
              <h3 className="font-medium text-gray-500">Ride To Bahria Town</h3>
              <p className="text-gray-500 text-sm">Today, 2:30 PM</p>
            </div>
            <p className="font-medium">-RS 120</p>
          </div>
        </div>
        
        <div className="border-b border-gray-100 pb-4">
          <div className="flex justify-between my-[15px]">
            <div>
              <h3 className="font-medium text-base text-gray-500">Drive To Johar Town</h3>
              <p className="text-gray-500 text-sm">Yesterday, 5:45 PM</p>
            </div>
            <p className="font-medium text-green-600">+RS 500</p>
          </div>
        </div>
        
        <div className="border-b border-gray-100 pb-4">
          <div className="flex justify-between my-[15px]">
            <div>
              <h3 className="font-medium text-gray-500">Ride to Dolmen Mall</h3>
              <p className="text-gray-500 text-sm">May 15, 10:20 AM</p>
            </div>
            <p className="font-medium">-RS 85</p>
          </div>
        </div>
      </div>
      
      <BottomNavigation />
    </div>;
};
export default Wallet;