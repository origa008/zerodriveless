
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CreateTestRideButtonProps {
  onSuccess?: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
}

export const CreateTestRideButton: React.FC<CreateTestRideButtonProps> = ({ 
  onSuccess, 
  variant = 'outline'
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCreateTestRide = async () => {
    if (isCreating || !user?.id) return;
    
    setIsCreating(true);
    console.log("Creating test ride for user:", user.id);
    
    try {
      // Create test ride directly using Supabase client
      const { data, error } = await supabase
        .from('rides')
        .insert({
          passenger_id: user.id,
          pickup_location: { 
            type: "Point",
            coordinates: [73.0479, 33.6844],
            name: "Test Pickup Location"
          },
          dropoff_location: {
            type: "Point",
            coordinates: [73.0682, 33.7294],
            name: "Test Dropoff Location"
          },
          status: 'searching',
          price: 250,
          distance: 5.2,
          duration: 15 * 60, // 15 minutes in seconds
          ride_option: { 
            id: "1", 
            name: "Standard", 
            type: "car",
            basePrice: 250
          },
          currency: 'RS',
          payment_method: 'cash'
        })
        .select()
        .single();
      
      if (error) {
        console.error("Supabase error creating test ride:", error);
        throw error;
      }
      
      console.log("Test ride created successfully with ID:", data?.id);
      
      toast({
        title: "Success",
        description: "Test ride created successfully",
      });
      
      if (onSuccess) onSuccess();
      
    } catch (err: any) {
      console.error("Error creating test ride:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to create test ride",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button 
      onClick={handleCreateTestRide}
      disabled={isCreating || !user?.id}
      variant={variant}
      size="sm"
    >
      {isCreating ? (
        <>
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          Creating...
        </>
      ) : (
        <>
          <Plus className="h-4 w-4 mr-1" />
          Create Test Ride
        </>
      )}
    </Button>
  );
};

export default CreateTestRideButton;
