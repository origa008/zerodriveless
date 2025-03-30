
import React from 'react';
import BottomNavigation from '@/components/layout/BottomNavigation';

const Offers: React.FC = () => {
  return (
    <div className="min-h-screen bg-white p-6 pb-20">
      <h1 className="text-3xl font-bold mb-6">Offers</h1>
      
      <div className="space-y-6">
        <div className="bg-zerodrive-purple/20 p-6 rounded-2xl">
          <h2 className="text-2xl font-medium mb-2">20% OFF</h2>
          <p className="text-gray-700 mb-4">
            Use code WELCOME20 on your first ride
          </p>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Valid until Jun 30, 2023</p>
            <button className="bg-black text-white px-4 py-2 rounded-lg">
              Apply
            </button>
          </div>
        </div>
        
        <div className="bg-gray-100 p-6 rounded-2xl">
          <h2 className="text-2xl font-medium mb-2">Weekend Special</h2>
          <p className="text-gray-700 mb-4">
            10% off on all weekend rides
          </p>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Every Saturday & Sunday</p>
            <button className="bg-black text-white px-4 py-2 rounded-lg">
              Apply
            </button>
          </div>
        </div>
        
        <div className="bg-gray-100 p-6 rounded-2xl">
          <h2 className="text-2xl font-medium mb-2">Refer a Friend</h2>
          <p className="text-gray-700 mb-4">
            Get RS 100 for each friend who joins
          </p>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">No expiration</p>
            <button className="bg-black text-white px-4 py-2 rounded-lg">
              Share
            </button>
          </div>
        </div>
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default Offers;
