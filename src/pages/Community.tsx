
import React from 'react';
import BottomNavigation from '@/components/layout/BottomNavigation';

const Community: React.FC = () => {
  return (
    <div className="min-h-screen bg-white p-6 pb-20">
      <h1 className="text-3xl font-bold mb-6">Community</h1>
      
      <div className="bg-zerodrive-purple/10 p-6 rounded-2xl mb-6">
        <h2 className="text-2xl font-medium mb-4">Connect with other riders</h2>
        <p className="text-gray-700 mb-4">
          Join the Zerodrive community to share tips, experiences, and connect with fellow riders.
        </p>
        <button className="bg-zerodrive-purple text-white px-6 py-3 rounded-xl">
          Join Community
        </button>
      </div>
      
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 p-4 rounded-2xl">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 rounded-full bg-gray-200 mr-4"></div>
            <div>
              <h3 className="font-medium">Sarah J.</h3>
              <p className="text-gray-500 text-sm">2 hours ago</p>
            </div>
          </div>
          <p>Just had the best driver! So friendly and professional. Love using Zerodrive!</p>
        </div>
        
        <div className="bg-white border border-gray-200 p-4 rounded-2xl">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 rounded-full bg-gray-200 mr-4"></div>
            <div>
              <h3 className="font-medium">Michael T.</h3>
              <p className="text-gray-500 text-sm">Yesterday</p>
            </div>
          </div>
          <p>Anyone else noticing faster arrival times lately? The app seems to be getting better!</p>
        </div>
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default Community;
