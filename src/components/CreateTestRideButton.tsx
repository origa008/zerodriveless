
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/context/AuthContext';
import { PlusCircle, Loader2 } from 'lucide-react';
import { createTestRide } from '@/lib/utils/dbFunctions';
import { useToast } from '@/hooks/use-toast';

interface CreateTestRideButtonProps {
  variant?: "default" | "outline";
  onSuccess?: () => void;
}

export const CreateTestRideButton: React.FC<CreateTestRideButtonProps> = ({
  variant = "default",
  onSuccess
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const handleCreateTestRide = async () => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a test ride',
        variant: 'destructive'
      });
      return;
    }
    
    setIsCreating(true);
    
    try {
      const { success, error, data } = await createTestRide(user.id);
      
      if (success && data) {
        toast({
          title: 'Success',
          description: 'Test ride created successfully',
        });
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error(error || 'Failed to create test ride');
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to create test ride',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleCreateTestRide}
      disabled={isCreating || !user}
      className={variant === "default" ? "bg-black hover:bg-gray-800 text-white" : "border-black text-black"}
    >
      {isCreating ? (
        <>
          <Loader2 size={14} className="mr-1 animate-spin" />
          Creating...
        </>
      ) : (
        <>
          <PlusCircle size={14} className="mr-1" />
          Create Test Ride
        </>
      )}
    </Button>
  );
};
