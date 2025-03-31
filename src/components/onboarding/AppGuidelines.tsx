
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Info, CheckCircle, Gift, Users, CreditCard } from 'lucide-react';

interface AppGuidelinesProps {
  onClose: () => void;
}

const AppGuidelines: React.FC<AppGuidelinesProps> = ({ onClose }) => {
  const [showGuidelines, setShowGuidelines] = useState(false);

  useEffect(() => {
    // Check if it's the first visit
    const hasSeenGuidelines = localStorage.getItem('hasSeenGuidelines');
    if (!hasSeenGuidelines) {
      setShowGuidelines(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('hasSeenGuidelines', 'true');
    setShowGuidelines(false);
    onClose();
  };

  if (!showGuidelines) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="mb-4 flex items-center">
          <Info size={24} className="text-blue-500 mr-3" />
          <h2 className="text-2xl font-bold">Welcome to ZeroDrive</h2>
        </div>
        
        <div className="space-y-4 mb-6">
          <p className="text-gray-600">
            It's a marketplace of a bunch of services. Please read our guidelines:
          </p>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <ul className="space-y-3">
              <li className="flex items-start">
                <CheckCircle className="text-blue-500 mr-2 mt-1 flex-shrink-0" size={18} />
                <span>First month is completely free for all users.</span>
              </li>
              <li className="flex items-start">
                <CreditCard className="text-blue-500 mr-2 mt-1 flex-shrink-0" size={18} />
                <span>Rs 1,000/month will be charged from drivers after 1 month.</span>
              </li>
              <li className="flex items-start">
                <Gift className="text-blue-500 mr-2 mt-1 flex-shrink-0" size={18} />
                <span>You can withdraw referral money only after 1 month of referral joining.</span>
              </li>
              <li className="flex items-start">
                <Users className="text-blue-500 mr-2 mt-1 flex-shrink-0" size={18} />
                <span>You can post twice a day in the community section.</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="text-blue-500 mr-2 mt-1 flex-shrink-0" size={18} />
                <span>You make money, we make money - share as much as possible!</span>
              </li>
            </ul>
          </div>
        </div>
        
        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
          onClick={handleAccept}
        >
          I Understand
        </Button>
      </div>
    </div>
  );
};

export default AppGuidelines;
