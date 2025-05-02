import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const RegisterDriver: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    vehicleType: '',
    licensePlate: '',
    drivingLicense: '',
    securityDeposit: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create driver profile
      const { error: driverError } = await supabase
        .from('drivers')
        .insert([
          {
            user_id: user.id,
            vehicle_type: formData.vehicleType,
            license_plate: formData.licensePlate,
            driving_license: formData.drivingLicense,
            security_deposit: formData.securityDeposit,
            status: 'pending',
          }
        ]);

      if (driverError) {
        throw driverError;
      }

      toast({
        title: 'Registration submitted',
        description: 'Your driver registration has been submitted for review. You will be notified once approved.',
      });

      // Redirect to ride requests
      navigate('/ride-requests');
    } catch (error: any) {
      console.error('Driver registration error:', error);
      toast({
        title: 'Registration failed',
        description: error.message || 'Failed to register as driver',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-white p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Register as Driver</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Vehicle Type</Label>
              <Input
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                placeholder="e.g., Sedan, SUV, etc."
                required
              />
            </div>
            
            <div>
              <Label>License Plate</Label>
              <Input
                name="licensePlate"
                value={formData.licensePlate}
                onChange={handleChange}
                placeholder="e.g., ABC-1234"
                required
              />
            </div>
            
            <div>
              <Label>Driving License Number</Label>
              <Input
                name="drivingLicense"
                value={formData.drivingLicense}
                onChange={handleChange}
                placeholder="Enter your driving license number"
                required
              />
            </div>
            
            <div>
              <Label>Security Deposit (₹)</Label>
              <Input
                name="securityDeposit"
                type="number"
                value={formData.securityDeposit}
                onChange={handleChange}
                placeholder="Enter security deposit amount"
                required
                min="1000"
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Submitting...' : 'Submit Registration'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterDriver;
