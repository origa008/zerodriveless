
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share, Copy, CreditCard } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

const ReferralCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [referralLink, setReferralLink] = useState(`https://zerodrive.com/ref/${user?.id || 'user123'}`);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Link copied!",
      description: "Referral link copied to clipboard",
      duration: 3000
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join ZeroDrive',
          text: 'Use my referral link to sign up for ZeroDrive and get a discount on your first ride!',
          url: referralLink,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-500 rounded-xl p-6 my-6 text-white">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold mb-1">Refer & Earn</h3>
          <p className="text-white/80">
            Share with friends & earn RS 50 for each referral
          </p>
        </div>
        <CreditCard size={36} className="text-white/30" />
      </div>
      
      <div className="bg-white/10 rounded-lg p-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm truncate mr-2">{referralLink}</span>
          <button 
            onClick={handleCopyLink}
            className="flex-shrink-0 bg-white/20 p-2 rounded-md hover:bg-white/30"
          >
            <Copy size={16} className="text-white" />
          </button>
        </div>
      </div>
      
      <Button
        className="w-full bg-white text-purple-600 hover:bg-white/90"
        onClick={handleShare}
      >
        <Share size={16} className="mr-2" />
        Share Your Link
      </Button>
      
      <p className="text-xs text-white/70 mt-3 text-center">
        You can withdraw referral earnings after your referred user completes 1 month on the platform
      </p>
    </div>
  );
};

export default ReferralCard;
