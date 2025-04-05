
import React, { useState, useEffect, useCallback } from 'react';
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
import { getAvailableRideRequests, subscribeToNearbyRides } from '@/lib/utils/rideUtils';
import { DriverDocument } from '@/lib/types';
import { UserRound, CarFront, Bike, Search, MapPin, Loader2 } from 'lucide-react';

const OfficialDriver: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [registrationStatus, setRegistrationStatus] = useState<string | null>(null);
  const [nearbyRides, setNearbyRides] = useState<any[]>([]);
  const [hasDeposit, setHasDeposit] = useState(false);
  
  const checkRegistrationStatus = useCallback(async () => {
    if (!user?.id) return;
    
    console.log("Checking driver registration status for user:", user.id);
    const { status, details } = await getDriverRegistrationStatus(user.id);
    console.log("Driver status:", status, "Details:", details);
    
    setRegistrationStatus(status);
    
    if (details) {
      setHasDeposit(details.has_sufficient_deposit || false);
    }
    
    setLoading(false);
  }, [user?.id]);
  
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
    checkRegistrationStatus();
    
    // Subscribe to status changes in real-time
    const unsubscribe = subscribeToDriverRegistration(user.id, (newStatus) => {
      console.log("Driver status changed:", newStatus);
      setRegistrationStatus(newStatus);
      checkRegistrationStatus();
      
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
  }, [user?.id, navigate, toast, checkRegistrationStatus]);
  
  // Subscribe to nearby ride requests if driver is approved and has deposit
  useEffect(() => {
    if (user?.id && registrationStatus === 'approved' && hasDeposit) {
      // Initial fetch of available rides
      const loadRides = async () => {
        const { rides } = await getAvailableRideRequests();
        setNearbyRides(rides);
      };
      
      loadRides();
      
      // Subscribe to new ride requests
      const unsubscribe = subscribeToNearbyRides(user.id, (rides) => {
        setNearbyRides(rides);
        
        if (rides.length > 0) {
          toast({
            title: "New ride request!",
            description: "A new ride request is available nearby",
            duration: 5000
          });
        }
      });
      
      return () => unsubscribe();
    }
  }, [user?.id, registrationStatus, hasDeposit, toast]);
  
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
  
  const handleRideAccept = (rideId: string) => {
    navigate(`/ride-progress?id=${rideId}`);
  };
  
  const renderAvailableRides = () => {
    if (nearbyRides.length === 0) {
      return (
        <div className="text-center py-10">
          <Search className="mx-auto mb-3 text-gray-400" size={40} />
          <h3 className="font-medium text-gray-600">No ride requests available</h3>
          <p className="text-gray-500 text-sm mt-1">Check back later for new requests</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        <h3 className="font-medium text-lg">Nearby Ride Requests</h3>
        {nearbyRides.map((ride) => (
          <div key={ride.id} className="border border-gray-200 rounded-xl p-4 bg-white">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                <UserRound className="mr-2 text-gray-600" size={18} />
                <span className="font-medium">{ride.passengers?.name || 'Passenger'}</span>
              </div>
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                {ride.price} {ride.currency}
              </span>
            </div>
            
            <div className="space-y-2 mb-3">
              <div className="flex items-start">
                <div className="mt-1 mr-2 bg-emerald-100 p-1 rounded-full">
                  <MapPin className="text-emerald-700" size={14} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Pickup</p>
                  <p className="text-xs text-gray-500">{ride.pickup_location.name}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="mt-1 mr-2 bg-red-100 p-1 rounded-full">
                  <MapPin className="text-red-700" size={14} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Dropoff</p>
                  <p className="text-xs text-gray-500">{ride.dropoff_location.name}</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {ride.distance.toFixed(1)} km • {Math.round(ride.duration / 60)} min
              </div>
              <Button 
                size="sm" 
                className="bg-zerodrive-purple hover:bg-violet-800" 
                onClick={() => handleRideAccept(ride.id)}
              >
                Accept
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const renderDepositAlert = () => {
    if (registrationStatus === 'approved' && !hasDeposit) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-amber-800">Deposit Required</h3>
          <p className="text-amber-700 text-sm mt-1">
            You need to add at least Rs. 3,000 to your wallet to start accepting rides.
          </p>
          <Button 
            className="mt-3 bg-amber-600 hover:bg-amber-700" 
            size="sm"
            onClick={() => navigate('/wallet')}
          >
            Add Funds
          </Button>
        </div>
      );
    }
    return null;
  };
  
  const renderRegistrationStatus = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-violet-700" />
            <p className="text-gray-600">Loading driver information...</p>
          </div>
        </div>
      );
    }
    
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
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-green-600">Driver Account Approved</h2>
            
            {renderDepositAlert()}
            
            <div className="flex gap-4 mb-6">
              <div className="flex-1 bg-violet-50 rounded-xl p-4 text-center">
                <CarFront size={32} className="mx-auto mb-2 text-violet-700" />
                <p className="text-sm font-medium">Auto</p>
              </div>
              <div className="flex-1 bg-violet-50 rounded-xl p-4 text-center">
                <Bike size={32} className="mx-auto mb-2 text-violet-700" />
                <p className="text-sm font-medium">Bike</p>
              </div>
            </div>
            
            {hasDeposit && renderAvailableRides()}
            
            {!hasDeposit && (
              <div className="text-center py-6">
                <p className="text-gray-600">
                  Add the required deposit to start receiving ride requests.
                </p>
                <Button 
                  onClick={() => navigate('/wallet')} 
                  className="mt-4 bg-zerodrive-purple"
                >
                  Go to Wallet
                </Button>
              </div>
            )}
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
      {renderRegistrationStatus()}
    </div>
  );
};

export default OfficialDriver;
