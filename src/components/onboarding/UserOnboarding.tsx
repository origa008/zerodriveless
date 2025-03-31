
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOnboarding } from '@/lib/hooks/useOnboarding';
import { User, Phone, MapPin } from 'lucide-react';

const UserOnboarding = () => {
  const {
    showOnboarding,
    phoneNumber,
    setPhoneNumber,
    address,
    setAddress,
    handleCompleteOnboarding
  } = useOnboarding();

  if (!showOnboarding) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Complete Your Profile</h2>
        <p className="text-gray-600 mb-6">Please provide some additional information to get started.</p>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number*</label>
            <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
              <Phone size={18} className="text-gray-500 mr-2" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+92 300 1234567"
                className="flex-1 outline-none"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Home Address</label>
            <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
              <MapPin size={18} className="text-gray-500 mr-2" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Your home address"
                className="flex-1 outline-none"
              />
            </div>
          </div>
        </div>
        
        <Button 
          className="w-full bg-black text-white" 
          onClick={handleCompleteOnboarding}
          disabled={!phoneNumber}
        >
          Save & Continue
        </Button>
      </div>
    </div>
  );
};

export default UserOnboarding;
