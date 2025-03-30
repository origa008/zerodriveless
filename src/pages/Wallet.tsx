import React from 'react';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { CreditCard, DollarSign, Building, Clock } from 'lucide-react';
const Wallet: React.FC = () => {
  return <div className="min-h-screen bg-white p-6 pb-20">
      <h1 className="text-3xl font-bold mb-6">Wallet</h1>
      
      <div className="bg-black text-white p-6 rounded-2xl mb-6">
        <p className="text-gray-300 mb-1">Available Balance</p>
        <h2 className="text-3xl font-bold mb-4">RS 1,250</h2>
        <Button className="bg-white text-black hover:bg-gray-100">
          Add Money
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-100 p-4 rounded-xl px-[16px] mx-0">
          <div className="flex items-center">
            <div className="bg-zerodrive-purple w-10 h-10 rounded-full flex items-center justify-center mr-3">
              <CreditCard size={20} className="text-white" />
            </div>
            <span>Cards</span>
          </div>
        </div>
        
        
        
        <div className="bg-gray-100 p-4 rounded-xl">
          <div className="flex items-center">
            <div className="bg-zerodrive-purple w-10 h-10 rounded-full flex items-center justify-center mr-3">
              <Building size={20} className="text-white" />
            </div>
            <span>Bank</span>
          </div>
        </div>
        
        
      </div>
      
      <h2 className="mb-4 text-4xl font-normal">Transactions</h2>
      
      <div className="space-y-4 bg-transparent">
        <div className="border-b border-gray-100 pb-4">
          <div className="flex justify-between">
            <div>
              <h3 className="font-medium text-gray-500">Ride to Angelina Paris Cafe</h3>
              <p className="text-gray-500 text-sm">Today, 2:30 PM</p>
            </div>
            <p className="font-medium">-RS 120</p>
          </div>
        </div>
        
        <div className="border-b border-gray-100 pb-4">
          <div className="flex justify-between">
            <div>
              <h3 className="font-medium text-base text-gray-500">Added to wallet</h3>
              <p className="text-gray-500 text-sm">Yesterday, 5:45 PM</p>
            </div>
            <p className="font-medium text-green-600">+RS 500</p>
          </div>
        </div>
        
        <div className="border-b border-gray-100 pb-4">
          <div className="flex justify-between">
            <div>
              <h3 className="font-medium text-gray-500">Ride to Hotel Tiquetonne</h3>
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