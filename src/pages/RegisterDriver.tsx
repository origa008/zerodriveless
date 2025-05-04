
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const RegisterDriver = () => {
  const { user } = useAuth();
  const [driverDetails, setDriverDetails] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchDriverDetails = async () => {
      const { data: driverDetails, error } = await supabase
        .from('driver_details')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching driver details:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch driver details.',
          variant: 'destructive',
        });
      } else {
        setDriverDetails(driverDetails);
      }
    };

    fetchDriverDetails();
  }, [user, navigate]);

  if (!user) {
    return null;
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
                <p className="text-gray-600">{driverDetails.status}</p>
              </div>
              <Button onClick={() => navigate('/official-driver')}>
                View Application
              </Button>
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
