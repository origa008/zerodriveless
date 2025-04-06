
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
import { getWalletBalance } from '@/lib/utils/walletUtils';
import { DriverDocument } from '@/lib/types';
import { 
  UserRound, CarFront, Bike, Search, MapPin, Loader2, 
  ShieldCheck, Wallet, Calendar, Clock, DollarSign, 
  ArrowLeft, Check, AlertTriangle, CheckCircle, Star, FileText
} from 'lucide-react';

const OfficialDriver: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [registrationStatus, setRegistrationStatus] = useState<string | null>(null);
  const [hasSubmittedApplication, setHasSubmittedApplication] = useState(false);
  const [nearbyRides, setNearbyRides] = useState<any[]>([]);
  const [hasDeposit, setHasDeposit] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(3000);
  
  const checkRegistrationStatus = useCallback(async () => {
    if (!user?.id) return;
    
    console.log("Checking driver registration status for user:", user.id);
    const { status, details } = await getDriverRegistrationStatus(user.id);
    console.log("Driver status:", status, "Details:", details);
    
    // Check if user has submitted an application
    setHasSubmittedApplication(!!status);
    setRegistrationStatus(status);
    
    if (details) {
      setHasDeposit(details.has_sufficient_deposit || false);
      setDepositAmount(details.deposit_amount_required || 3000);
      
      // If wallet balance status changes, refresh the page
      if (details.has_sufficient_deposit !== hasDeposit && status === 'approved') {
        toast({
          title: "Deposit Verified",
          description: "Your driver deposit has been verified. You can now go online and accept rides!",
          duration: 5000
        });
      }
    }

    // Get wallet balance
    if (user?.id) {
      const { balance } = await getWalletBalance(user.id);
      setWalletBalance(balance);
    }
    
    setLoading(false);
  }, [user?.id, hasDeposit, toast]);
  
  // Check driver status on load and set up real-time subscription
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
  
  // Handle registration form submission
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
          vehicleType: data.vehicleType || 'Bike',
          vehicleModel: data.vehicleModel,
          vehicleColor: data.vehicleColor,
          driverLicenseNumber: data.driverLicenseNumber
        }
      );
      
      if (success) {
        toast({
          title: "Application Submitted",
          description: "Your driver application has been submitted for review.",
          duration: 5000
        });
        setRegistrationStatus('pending');
        setHasSubmittedApplication(true);
        setShowRegistrationForm(false);
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
                {ride.distance?.toFixed(1)} km • {Math.round(ride.duration / 60)} min
              </div>
              <Button 
                size="sm" 
                className="bg-black hover:bg-gray-800 text-white" 
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
          <h3 className="font-medium text-amber-800 flex items-center">
            <AlertTriangle className="mr-2" size={18} />
            Deposit Required
          </h3>
          <p className="text-amber-700 text-sm mt-1">
            You need to add at least Rs. {depositAmount.toLocaleString()} to your wallet to start accepting rides.
          </p>
          <div className="mt-2 bg-amber-100 rounded-lg p-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-amber-800">Current Balance:</span>
              <span className="font-medium text-amber-800">Rs. {walletBalance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-amber-800">Required:</span>
              <span className="font-medium text-amber-800">Rs. {depositAmount.toLocaleString()}</span>
            </div>
          </div>
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

  // NEW UI based on the provided images
  const renderDriverBenefits = () => {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Benefits of becoming a ZeroDrive Driver</h2>
        
        <div className="space-y-4">
          <div className="p-4 border-l-4 border-green-500 bg-white rounded-lg flex items-center">
            <Check className="text-green-500 mr-3" size={24} />
            <p className="font-medium">Priority access to high-value ride requests</p>
          </div>
          
          <div className="p-4 border-l-4 border-green-500 bg-white rounded-lg flex items-center">
            <Check className="text-green-500 mr-3" size={24} />
            <p className="font-medium">Lower platform fees (0.5% vs 1% for regular drivers)</p>
          </div>
          
          <div className="p-4 border-l-4 border-green-500 bg-white rounded-lg flex items-center">
            <Check className="text-green-500 mr-3" size={24} />
            <p className="font-medium">Exclusive driver insurance coverage</p>
          </div>
          
          <div className="p-4 border-l-4 border-green-500 bg-white rounded-lg flex items-center">
            <Check className="text-green-500 mr-3" size={24} />
            <p className="font-medium">Daily payment settlement</p>
          </div>
          
          <div className="p-4 border-l-4 border-green-500 bg-white rounded-lg flex items-center">
            <Check className="text-green-500 mr-3" size={24} />
            <p className="font-medium">Official Zero Drive uniform and merchandise</p>
          </div>
        </div>
      </div>
    );
  };

  const renderDriverRequirements = () => {
    return (
      <div className="mb-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-4">Driver Requirements</h2>
          <ul className="space-y-3 pl-1">
            <li className="flex items-start">
              <div className="mt-1 mr-2 text-gray-400">•</div>
              <p>Valid Pakistani driving license (at least 2 years old)</p>
            </li>
            <li className="flex items-start">
              <div className="mt-1 mr-2 text-gray-400">•</div>
              <p>Minimum age of 21 years</p>
            </li>
            <li className="flex items-start">
              <div className="mt-1 mr-2 text-gray-400">•</div>
              <p>Clear background check</p>
            </li>
            <li className="flex items-start">
              <div className="mt-1 mr-2 text-gray-400">•</div>
              <p>Smartphone with Android 8.0+ or iOS 13+</p>
            </li>
          </ul>
        </div>
        
        <div>
          <h2 className="text-xl font-bold mb-4">Vehicle Requirements</h2>
          <ul className="space-y-3 pl-1">
            <li className="flex items-start">
              <div className="mt-1 mr-2 text-gray-400">•</div>
              <p>Model year 2015 or newer</p>
            </li>
            <li className="flex items-start">
              <div className="mt-1 mr-2 text-gray-400">•</div>
              <p>4-door vehicle in excellent condition</p>
            </li>
            <li className="flex items-start">
              <div className="mt-1 mr-2 text-gray-400">•</div>
              <p>Valid registration and insurance</p>
            </li>
            <li className="flex items-start">
              <div className="mt-1 mr-2 text-gray-400">•</div>
              <p>Pass vehicle inspection</p>
            </li>
          </ul>
        </div>
      </div>
    );
  };

  const renderRequiredDocuments = () => {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Required Documents</h2>
        
        <ul className="space-y-3 pl-1">
          <li className="flex items-start">
            <div className="mt-1 mr-2 text-gray-400">•</div>
            <p>CNIC (front and back)</p>
          </li>
          <li className="flex items-start">
            <div className="mt-1 mr-2 text-gray-400">•</div>
            <p>Driving license (front and back)</p>
          </li>
          <li className="flex items-start">
            <div className="mt-1 mr-2 text-gray-400">•</div>
            <p>Vehicle registration certificate</p>
          </li>
          <li className="flex items-start">
            <div className="mt-1 mr-2 text-gray-400">•</div>
            <p>Vehicle photos (front, back, sides)</p>
          </li>
          <li className="flex items-start">
            <div className="mt-1 mr-2 text-gray-400">•</div>
            <p>Selfie photo holding CNIC</p>
          </li>
          <li className="flex items-start">
            <div className="mt-1 mr-2 text-gray-400">•</div>
            <p>Clear profile photo for your driver account</p>
          </li>
        </ul>
        
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="text-amber-600 mr-2 mt-1" size={16} />
            <p className="text-amber-700 text-sm">
              The application process takes approximately 3-5 business days. You'll need to visit our office for documentation verification and vehicle inspection.
            </p>
          </div>
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
          <div className="p-8">
            <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm text-center mb-6">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Application Under Review</h2>
              <p className="text-gray-600 mb-6">
                Your driver registration is being reviewed by our team. This process usually takes 1-2 business days.
              </p>
              <div className="p-4 bg-blue-50 rounded-lg text-blue-700 mb-6">
                <p className="font-medium">We'll notify you when your application is approved!</p>
                <p className="text-sm mt-2">Meanwhile, you can continue using ZeroDrive as a passenger.</p>
              </div>
              <Button onClick={() => navigate('/')}>Return to Home</Button>
            </div>
          </div>
        );
      case 'approved':
        return (
          <div className="p-6">
            <div className="mb-6 bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mr-3">
                  <CheckCircle className="h-7 w-7 text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-green-600">Driver Account Approved</h2>
                  <p className="text-sm text-gray-600">Your application has been approved by our team</p>
                </div>
              </div>
              
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
              
              <Button
                className="w-full bg-black text-white hover:bg-gray-800 py-3 text-lg rounded-xl"
                onClick={() => navigate('/')}
              >
                Start Accepting Rides
              </Button>
            </div>
            
            {hasDeposit ? renderAvailableRides() : (
              <div className="text-center py-6 bg-white rounded-xl border border-gray-100 shadow-sm">
                <Wallet className="h-12 w-12 mx-auto mb-3 text-amber-500" />
                <p className="text-gray-600 font-medium">
                  Add the required deposit to start receiving ride requests.
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Deposit is fully refundable when you leave the platform.
                </p>
                <Button 
                  onClick={() => navigate('/wallet')} 
                  className="bg-black text-white hover:bg-gray-800"
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
            <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm mb-6">
              <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-red-600">Application Rejected</h2>
              <p className="text-gray-600 mb-6">
                We're sorry, but your driver application has been rejected. Please contact our support team for more information.
              </p>
              <div className="p-4 bg-red-50 rounded-lg text-red-700 mb-6">
                <p className="font-medium">Common reasons for rejection:</p>
                <ul className="text-sm mt-2 text-left list-disc pl-5">
                  <li>Incomplete or incorrect documentation</li>
                  <li>Vehicle does not meet our requirements</li>
                  <li>Issues with your driving history</li>
                </ul>
              </div>
              <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
                <Button onClick={() => setShowRegistrationForm(true)} variant="outline">
                  Resubmit Application
                </Button>
                <Button onClick={() => navigate('/')}>
                  Return to Home
                </Button>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="p-6">
            <div className="bg-black text-white p-6 -mx-6 -mt-6 mb-8">
              <h1 className="text-3xl font-bold">Official Driver Program</h1>
              <p className="mt-2 text-gray-300">Join our certified driver program</p>
            </div>
            
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Become an Official Driver</h2>
              <p className="text-gray-600 mb-6">
                The Official Driver Program gives you access to premium ride requests, higher earnings, and exclusive benefits.
              </p>
            </div>
            
            {renderDriverBenefits()}
            {renderDriverRequirements()}
            {renderRequiredDocuments()}
            
            <div className="text-center bg-white rounded-xl p-8 border border-gray-100 shadow-sm">
              <Button 
                size="lg"
                className="w-full bg-black text-white hover:bg-gray-800 px-8 py-6 text-lg flex items-center justify-center"
                onClick={() => setShowRegistrationForm(true)}
                disabled={hasSubmittedApplication}
              >
                <FileText className="mr-2" size={20} />
                {hasSubmittedApplication ? 'Application Already Submitted' : 'Submit Documents'}
              </Button>
              
              {hasSubmittedApplication && (
                <p className="mt-4 text-sm text-gray-500">
                  You have already submitted an application. <span className="text-blue-600 cursor-pointer" onClick={() => navigate('/')}>Return to Homepage</span>
                </p>
              )}
            </div>
          </div>
        );
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <button onClick={() => navigate('/')} className="absolute top-4 left-4 flex items-center text-white z-10">
        <ArrowLeft size={20} className="mr-2" />
        Back
      </button>
      
      <div className="container mx-auto px-4 pb-8">
        {renderRegistrationStatus()}
      </div>
    </div>
  );
};

export default OfficialDriver;
