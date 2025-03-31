
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';

export const useOnboarding = () => {
  const { user, updateUserProfile } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  const [address, setAddress] = useState('');
  
  useEffect(() => {
    if (user?.isLoggedIn && (!user.phone || user.phone === '')) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [user]);

  const handleCompleteOnboarding = () => {
    if (phoneNumber) {
      updateUserProfile({ phone: phoneNumber, address });
      setShowOnboarding(false);
    }
  };

  return {
    showOnboarding,
    setShowOnboarding,
    onboardingStep,
    setOnboardingStep,
    phoneNumber,
    setPhoneNumber,
    address,
    setAddress,
    handleCompleteOnboarding
  };
};
