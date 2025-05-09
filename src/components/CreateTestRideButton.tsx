
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { createTestRideViaFunction } from '@/lib/utils/createTestRide';
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
    if (isCreating) return;
    
    setIsCreating(true);
    
    try {
      // Log user ID for debugging
      console.log("Creating test ride with user ID:", user?.id);
      
      const { success, error } = await createTestRideViaFunction(user?.id);
      
      if (success) {
        toast({
          title: "Success",
          description: "Test ride created successfully",
        });
        
        if (onSuccess) onSuccess();
      } else {
        toast({
          title: "Error",
          description: error || "Failed to create test ride",
          variant: "destructive"
        });
      }
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
      disabled={isCreating}
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
