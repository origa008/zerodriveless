
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const RegisterDriver = () => {
  const { user } = useAuth();
  const [driverDetails, setDriverDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [depositRequired, setDepositRequired] = useState(3000);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchDriverDetails = async () => {
      setLoading(true);
      try {
        // Get driver details
        const { data: driverDetails, error } = await supabase
          .from('driver_details')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching driver details:', error);
          toast({
            title: 'Error',
            description: 'Failed to fetch driver details.',
            variant: 'destructive',
          });
        } else {
          setDriverDetails(driverDetails);
          
          // If driver details exist, store the required deposit amount
          if (driverDetails) {
            setDepositRequired(driverDetails.deposit_amount_required || 3000);
          }
        }

        // Get wallet balance
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        if (!walletError && wallet) {
          setWalletBalance(wallet.balance);
        } else if (walletError) {
          console.error('Error fetching wallet:', walletError);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDriverDetails();
  }, [user, navigate]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="container mx-auto mt-10 flex justify-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-10">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Driver Registration Status</CardTitle>
          <CardDescription>
            View your driver registration status and complete the process.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {driverDetails ? (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Status:</p>
                <p className={`inline-block px-2 py-1 rounded-full text-sm ${getStatusBadgeColor(driverDetails.status)}`}>
                  {driverDetails.status.charAt(0).toUpperCase() + driverDetails.status.slice(1)}
                </p>
              </div>

              {driverDetails.status === 'approved' && (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-sm font-medium">Security Deposit:</p>
                  <div className="flex justify-between">
                    <p>Required Amount:</p>
                    <p className="font-semibold">{depositRequired} RS</p>
                  </div>
                  <div className="flex justify-between">
                    <p>Your Balance:</p>
                    <p className={`font-semibold ${walletBalance >= depositRequired ? 'text-green-600' : 'text-red-600'}`}>
                      {walletBalance} RS
                    </p>
                  </div>
                  {walletBalance < depositRequired && (
                    <Button onClick={() => navigate('/wallet')} className="w-full mt-2">
                      Add Funds to Wallet
                    </Button>
                  )}
                </div>
              )}

              <Button 
                onClick={() => navigate('/official-driver')}
                variant={driverDetails.status === 'approved' ? 'outline' : 'default'}
              >
                {driverDetails.status === 'approved' ? 'View Details' : 'Complete Application'}
              </Button>

              {driverDetails.status === 'approved' && walletBalance >= depositRequired && (
                <Button 
                  onClick={() => navigate('/ride-requests')} 
                  className="bg-green-600 hover:bg-green-700"
                >
                  Start Accepting Rides
                </Button>
              )}
            </>
          ) : (
            <>
              <p className="text-gray-600">
                You have not yet started the driver registration process.
              </p>
              <Button onClick={() => navigate('/official-driver')}>
                Start Application
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterDriver;
