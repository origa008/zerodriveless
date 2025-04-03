
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DriverRegistration from '@/components/driver/DriverRegistration';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  submitDriverRegistration, 
  uploadDriverDocument,
  getDriverRegistrationStatus,
  subscribeToDriverRegistration
} from '@/lib/utils/driverUtils';
import { DriverDocument } from '@/lib/types';

const OfficialDriver: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<string | null>(null);
  
  useEffect(() => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to register as a driver",
        duration: 3000
      });
      navigate('/login');
      return;
    }
    
    // Check if user is already registered
    const checkRegistrationStatus = async () => {
      const { status } = await getDriverRegistrationStatus(user.id);
      setRegistrationStatus(status);
    };
    
    checkRegistrationStatus();
    
    // Subscribe to status changes
    const unsubscribe = subscribeToDriverRegistration(user.id, (newStatus) => {
      setRegistrationStatus(newStatus);
      
      if (newStatus === 'approved') {
        toast({
          title: "Application Approved",
          description: "Your driver application has been approved!",
          duration: 5000
        });
      } else if (newStatus === 'rejected') {
        toast({
          title: "Application Rejected",
          description: "Your driver application has been rejected. Please contact support.",
          duration: 5000
        });
      }
    });
    
    return () => unsubscribe();
  }, [user?.id, navigate, toast]);
  
  const handleSubmit = async (data: DriverDocument) => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to register as a driver",
        duration: 3000
      });
      navigate('/login');
      return;
    }
    
    setLoading(true);
    
    try {
      // Upload all documents to Supabase storage
      const documentUrls: Record<string, string> = {};
      const uploadPromises = [];
      
      if (data.cnicFrontPhoto) {
        uploadPromises.push(
          uploadDriverDocument(user.id, data.cnicFrontPhoto, 'cnic-front')
            .then(({ url }) => {
              if (url) documentUrls.cnicFront = url;
            })
        );
      }
      
      if (data.cnicBackPhoto) {
        uploadPromises.push(
          uploadDriverDocument(user.id, data.cnicBackPhoto, 'cnic-back')
            .then(({ url }) => {
              if (url) documentUrls.cnicBack = url;
            })
        );
      }
      
      if (data.driverLicenseFrontPhoto) {
        uploadPromises.push(
          uploadDriverDocument(user.id, data.driverLicenseFrontPhoto, 'license-front')
            .then(({ url }) => {
              if (url) documentUrls.licenseFront = url;
            })
        );
      }
      
      if (data.driverLicenseBackPhoto) {
        uploadPromises.push(
          uploadDriverDocument(user.id, data.driverLicenseBackPhoto, 'license-back')
            .then(({ url }) => {
              if (url) documentUrls.licenseBack = url;
            })
        );
      }
      
      if (data.vehicleRegistrationPhoto) {
        uploadPromises.push(
          uploadDriverDocument(user.id, data.vehicleRegistrationPhoto, 'vehicle-registration')
            .then(({ url }) => {
              if (url) documentUrls.vehicleRegistration = url;
            })
        );
      }
      
      if (data.vehiclePhoto) {
        uploadPromises.push(
          uploadDriverDocument(user.id, data.vehiclePhoto, 'vehicle-photo')
            .then(({ url }) => {
              if (url) documentUrls.vehiclePhoto = url;
            })
        );
      }
      
      if (data.selfieWithCNIC) {
        uploadPromises.push(
          uploadDriverDocument(user.id, data.selfieWithCNIC, 'selfie-with-cnic')
            .then(({ url }) => {
              if (url) documentUrls.selfieWithCNIC = url;
            })
        );
      }
      
      if (data.selfiePhoto) {
        uploadPromises.push(
          uploadDriverDocument(user.id, data.selfiePhoto, 'selfie')
            .then(({ url }) => {
              if (url) documentUrls.selfiePhoto = url;
            })
        );
      }
      
      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      
      // Submit driver registration
      const { success, error } = await submitDriverRegistration(
        user.id,
        documentUrls,
        {
          fullName: data.fullName,
          cnicNumber: data.cnicNumber,
          vehicleRegistrationNumber: data.vehicleRegistrationNumber,
          vehicleType: data.vehicleType || 'Bike'
        }
      );
      
      if (success) {
        toast({
          title: "Application Submitted",
          description: "Your driver application has been submitted for review.",
          duration: 5000
        });
        setRegistrationStatus('pending');
        navigate('/');
      } else {
        throw new Error(error || "Failed to submit application");
      }
    } catch (error: any) {
      console.error("Driver registration error:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to submit driver registration",
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleClose = () => {
    navigate('/');
  };
  
  const renderRegistrationStatus = () => {
    switch (registrationStatus) {
      case 'pending':
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Application Under Review</h2>
            <p className="text-gray-600 mb-6">
              Your driver registration is being reviewed by our team. This process usually takes 1-2 business days.
            </p>
            <Button onClick={() => navigate('/')}>Return to Home</Button>
          </div>
        );
      case 'approved':
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4 text-green-600">Application Approved</h2>
            <p className="text-gray-600 mb-6">
              Congratulations! Your driver application has been approved. You can now switch to driver mode and start accepting ride requests.
            </p>
            <Button onClick={() => navigate('/')}>Start Driving</Button>
          </div>
        );
      case 'rejected':
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4 text-red-600">Application Rejected</h2>
            <p className="text-gray-600 mb-6">
              We're sorry, but your driver application has been rejected. Please contact our support team for more information.
            </p>
            <Button onClick={() => navigate('/')}>Return to Home</Button>
          </div>
        );
      default:
        return (
          <DriverRegistration 
            onClose={handleClose}
            onSubmit={handleSubmit}
          />
        );
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <p>Processing your application...</p>
        </div>
      ) : (
        renderRegistrationStatus()
      )}
    </div>
  );
};

export default OfficialDriver;
