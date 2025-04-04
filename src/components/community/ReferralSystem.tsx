
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Copy, Check } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [loading, setLoading] = useState(true);
  const [referralInfo, setReferralInfo] = useState<ReferralInfo>({
    code: '',
    totalInvited: 0,
    pending: 0,
    completed: 0,
    earned: 0
  });
  
  // Fetch referral data and subscribe to real-time updates
  useEffect(() => {
    if (user?.id) {
      fetchReferralInfo();
      
      // Subscribe to referral table changes
      const channel = supabase
        .channel('public:referrals')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'referrals',
            filter: `referrer_id=eq.${user.id}`
          }, 
          () => {
            fetchReferralInfo();
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);
  
  const fetchReferralInfo = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch the user's referral code
      const { data: profileData } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single();
      
      const referralCode = profileData?.referral_code || '';
      
      // Fetch referrals data
      const { data: referralsData } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id);
      
      // Calculate statistics
      const totalInvited = referralsData?.length || 0;
      const pending = referralsData?.filter(r => r.status === 'pending').length || 0;
      const completed = referralsData?.filter(r => r.status === 'completed').length || 0;
      const earned = referralsData
        ?.filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
      
      setReferralInfo({
        code: referralCode,
        totalInvited,
        pending,
        completed,
        earned
      });
    } catch (error) {
      console.error('Error fetching referral info:', error);
    } finally {
      setLoading(false);
    }
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
  
  if (loading) {
    return (
      <div className="bg-zerodrive-purple/10 p-6 rounded-2xl mb-6">
        <h2 className="text-2xl font-medium mb-4">Refer & Earn</h2>
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-xl mb-4" />
          <div className="flex justify-between mb-4">
            {Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-16 w-24" />
            ))}
          </div>
          <Skeleton className="h-24 w-full rounded-xl mb-4" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }
  
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
