
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Copy, Check } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

type ReferralInfo = {
  code: string;
  totalInvited: number;
  pending: number;
  completed: number;
  earned: number;
};

const ReferralSystem: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  // In a real app, this would come from the backend
  const referralInfo: ReferralInfo = {
    code: user?.id ? `zerodrive-${user.id}` : 'zerodrive-123',
    totalInvited: 3,
    pending: 2,
    completed: 1,
    earned: 50  // Rs 50 per successful referral
  };
  
  const referralLink = `https://zerodrive.app/register?ref=${referralInfo.code}`;
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink)
      .then(() => {
        setCopied(true);
        toast({
          title: "Link copied!",
          description: "Referral link copied to clipboard",
          duration: 3000
        });
        
        setTimeout(() => setCopied(false), 3000);
      })
      .catch(err => {
        toast({
          title: "Could not copy link",
          description: "Please try again",
          variant: "destructive",
          duration: 3000
        });
      });
  };
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Zerodrive',
          text: 'Join Zerodrive using my referral link and get exciting benefits!',
          url: referralLink,
        });
      } catch (error) {
        toast({
          title: "Error sharing",
          description: "Could not share the referral link",
          variant: "destructive",
          duration: 3000
        });
      }
    } else {
      handleCopyLink();
    }
  };
  
  return (
    <div className="bg-zerodrive-purple/10 p-6 rounded-2xl mb-6">
      <h2 className="text-2xl font-medium mb-2">Refer & Earn</h2>
      <p className="text-gray-700 mb-4">
        Invite friends to join Zerodrive. For each friend who joins as a driver, you earn Rs 50!
      </p>
      
      <div className="bg-white p-4 rounded-xl mb-4 border border-gray-200">
        <p className="text-sm text-gray-500 mb-1">Your referral code</p>
        <div className="flex items-center justify-between">
          <span className="font-medium text-lg">{referralInfo.code}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2"
            onClick={handleCopyLink}
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          </Button>
        </div>
      </div>
      
      <div className="flex justify-between mb-4">
        <div className="text-center">
          <p className="text-sm text-gray-500">Total Invited</p>
          <p className="font-bold text-xl">{referralInfo.totalInvited}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="font-bold text-xl">{referralInfo.pending}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="font-bold text-xl">{referralInfo.completed}</p>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-xl mb-4 border border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Total Earned</p>
            <p className="font-bold text-xl">Rs {referralInfo.earned}</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => { window.location.href = '/wallet'; }}
          >
            View in Wallet
          </Button>
        </div>
      </div>
      
      <Button 
        className="w-full bg-zerodrive-purple text-white flex items-center justify-center"
        onClick={handleShare}
      >
        <Share2 size={18} className="mr-2" />
        Share Referral Link
      </Button>
    </div>
  );
};

export default ReferralSystem;
