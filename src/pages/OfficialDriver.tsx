
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
import { UserRound, CarFront, Bike, Search, MapPin, Loader2, ShieldCheck, Wallet, Calendar, Clock, DollarSign } from 'lucide-react';

const OfficialDriver: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [registrationStatus, setRegistrationStatus] = useState<string | null>(null);
  const [nearbyRides, setNearbyRides] = useState<any[]>([]);
  const [hasDeposit, setHasDeposit] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  
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
    setShowRegistrationForm(false);
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

  const renderDriverBenefits = () => {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Benefits of becoming a ZeroDrive Driver</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
            <DollarSign className="h-10 w-10 p-2 bg-green-100 text-green-700 rounded-full mb-3" />
            <h3 className="text-lg font-medium mb-1">Competitive Earnings</h3>
            <p className="text-gray-600 text-sm">Earn up to 80% of each fare with flexible working hours</p>
          </div>
          
          <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
            <Calendar className="h-10 w-10 p-2 bg-blue-100 text-blue-700 rounded-full mb-3" />
            <h3 className="text-lg font-medium mb-1">Flexible Schedule</h3>
            <p className="text-gray-600 text-sm">Work whenever you want, no minimum hours required</p>
          </div>
          
          <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
            <Clock className="h-10 w-10 p-2 bg-purple-100 text-purple-700 rounded-full mb-3" />
            <h3 className="text-lg font-medium mb-1">Quick Payments</h3>
            <p className="text-gray-600 text-sm">Get paid immediately after completing rides</p>
          </div>
          
          <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
            <ShieldCheck className="h-10 w-10 p-2 bg-amber-100 text-amber-700 rounded-full mb-3" />
            <h3 className="text-lg font-medium mb-1">Safety & Support</h3>
            <p className="text-gray-600 text-sm">24/7 support team and safety features</p>
          </div>
        </div>
      </div>
    );
  };

  const renderDriverRequirements = () => {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Requirements</h2>
        
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-lg font-medium mb-3">Documents Required</h3>
          
          <ul className="space-y-3">
            <li className="flex items-start">
              <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center text-green-700 mr-2 mt-0.5">✓</div>
              <div>
                <p className="font-medium">National ID Card (CNIC)</p>
                <p className="text-sm text-gray-500">Front and back photos of your valid CNIC</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center text-green-700 mr-2 mt-0.5">✓</div>
              <div>
                <p className="font-medium">Driver's License</p>
                <p className="text-sm text-gray-500">Front and back photos of your valid driver's license</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center text-green-700 mr-2 mt-0.5">✓</div>
              <div>
                <p className="font-medium">Vehicle Registration</p>
                <p className="text-sm text-gray-500">Photo of your vehicle registration document</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center text-green-700 mr-2 mt-0.5">✓</div>
              <div>
                <p className="font-medium">Profile Photo</p>
                <p className="text-sm text-gray-500">Clear photo of yourself</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center text-green-700 mr-2 mt-0.5">✓</div>
              <div>
                <p className="font-medium">Vehicle Photo</p>
                <p className="text-sm text-gray-500">Clear photo of your vehicle</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="h-5 w-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 mr-2 mt-0.5">
                <Wallet size={12} />
              </div>
              <div>
                <p className="font-medium">Security Deposit: Rs 3,000</p>
                <p className="text-sm text-gray-500">Required after approval (refundable)</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    );
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
    
    if (showRegistrationForm) {
      return (
        <DriverRegistration 
          onClose={handleClose}
          onSubmit={handleSubmit}
        />
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
          <div className="p-6">
            {renderDriverBenefits()}
            {renderDriverRequirements()}
            
            <div className="text-center">
              <Button 
                size="lg"
                className="bg-black text-white hover:bg-gray-800 px-8 py-6 text-lg"
                onClick={() => setShowRegistrationForm(true)}
              >
                Submit Driver Application
              </Button>
              
              <p className="mt-4 text-sm text-gray-500">
                Already submitted an application? <span className="text-blue-600 cursor-pointer" onClick={() => navigate('/')}>Return to Homepage</span>
              </p>
            </div>
          </div>
        );
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-zerodrive-purple text-white p-6">
        <button onClick={() => navigate('/')} className="mb-4 flex items-center text-white">
          <ArrowLeft size={20} className="mr-2" />
          Back
        </button>
        <h1 className="text-3xl font-bold">Official Driver Registration</h1>
        <p className="mt-2">Join our team of professional drivers and start earning today.</p>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        {renderRegistrationStatus()}
      </div>
    </div>
  );
};

export default OfficialDriver;
