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
  ArrowLeft, Check, AlertTriangle, CheckCircle, Star, FileText,
  Phone, CreditCard, Mail, MapPinned
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
  const [formPhase, setFormPhase] = useState<number>(1);
  const [formData, setFormData] = useState<Partial<DriverDocument>>({});
  
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
  
  // Handle form phase navigation
  const nextPhase = () => {
    setFormPhase(prev => Math.min(prev + 1, 5));
  };
  
  const prevPhase = () => {
    setFormPhase(prev => Math.max(prev - 1, 1));
  };
  
  // Handle form field changes
  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
    setFormPhase(1);
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

  // UI for benefits and requirements sections
  const renderDriverBenefits = () => {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Benefits of becoming a ZeroDrive Driver</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 border-l-4 border-violet-500 bg-white rounded-lg shadow-sm">
            <div className="flex items-center mb-2">
              <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center mr-3">
                <DollarSign className="h-5 w-5 text-violet-600" />
              </div>
              <h3 className="font-bold text-lg">Higher Earnings</h3>
            </div>
            <p className="text-gray-600 ml-13">Priority access to high-value ride requests with lower platform fees (20% vs 25% for regular drivers)</p>
          </div>
          
          <div className="p-5 border-l-4 border-violet-500 bg-white rounded-lg shadow-sm">
            <div className="flex items-center mb-2">
              <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center mr-3">
                <ShieldCheck className="h-5 w-5 text-violet-600" />
              </div>
              <h3 className="font-bold text-lg">Insurance Coverage</h3>
            </div>
            <p className="text-gray-600 ml-13">Exclusive driver insurance coverage for accidents and health emergencies</p>
          </div>
          
          <div className="p-5 border-l-4 border-violet-500 bg-white rounded-lg shadow-sm">
            <div className="flex items-center mb-2">
              <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center mr-3">
                <Clock className="h-5 w-5 text-violet-600" />
              </div>
              <h3 className="font-bold text-lg">Daily Payments</h3>
            </div>
            <p className="text-gray-600 ml-13">Get paid daily directly to your wallet with instant withdrawal options</p>
          </div>
          
          <div className="p-5 border-l-4 border-violet-500 bg-white rounded-lg shadow-sm">
            <div className="flex items-center mb-2">
              <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center mr-3">
                <Star className="h-5 w-5 text-violet-600" />
              </div>
              <h3 className="font-bold text-lg">Premium Status</h3>
            </div>
            <p className="text-gray-600 ml-13">Official ZeroDrive uniform and merchandise to enhance customer trust</p>
          </div>
        </div>
      </div>
    );
  };

  const renderDriverRequirements = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b border-gray-200">Driver Requirements</h2>
          <ul className="space-y-3">
            <li className="flex items-center">
              <Check className="mr-3 text-green-500" size={18} />
              <span>Valid Pakistani driving license (2+ years)</span>
            </li>
            <li className="flex items-center">
              <Check className="mr-3 text-green-500" size={18} />
              <span>Minimum age of 21 years</span>
            </li>
            <li className="flex items-center">
              <Check className="mr-3 text-green-500" size={18} />
              <span>Clear background check</span>
            </li>
            <li className="flex items-center">
              <Check className="mr-3 text-green-500" size={18} />
              <span>Smartphone with Android 8.0+ or iOS 13+</span>
            </li>
          </ul>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b border-gray-200">Vehicle Requirements</h2>
          <ul className="space-y-3">
            <li className="flex items-center">
              <Check className="mr-3 text-green-500" size={18} />
              <span>Model year 2015 or newer</span>
            </li>
            <li className="flex items-center">
              <Check className="mr-3 text-green-500" size={18} />
              <span>4-door vehicle in excellent condition</span>
            </li>
            <li className="flex items-center">
              <Check className="mr-3 text-green-500" size={18} />
              <span>Valid registration and insurance</span>
            </li>
            <li className="flex items-center">
              <Check className="mr-3 text-green-500" size={18} />
              <span>Pass vehicle inspection</span>
            </li>
          </ul>
        </div>
      </div>
    );
  };

  const renderRequiredDocuments = () => {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
        <h2 className="text-xl font-bold mb-4 pb-2 border-b border-gray-200">Required Documents</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ul className="space-y-3">
            <li className="flex items-center">
              <Check className="mr-3 text-green-500" size={18} />
              <span>CNIC (front and back)</span>
            </li>
            <li className="flex items-center">
              <Check className="mr-3 text-green-500" size={18} />
              <span>Driving license (front and back)</span>
            </li>
            <li className="flex items-center">
              <Check className="mr-3 text-green-500" size={18} />
              <span>Vehicle registration certificate</span>
            </li>
          </ul>
          
          <ul className="space-y-3">
            <li className="flex items-center">
              <Check className="mr-3 text-green-500" size={18} />
              <span>Vehicle photos</span>
            </li>
            <li className="flex items-center">
              <Check className="mr-3 text-green-500" size={18} />
              <span>Selfie photo holding CNIC</span>
            </li>
            <li className="flex items-center">
              <Check className="mr-3 text-green-500" size={18} />
              <span>Clear profile photo</span>
            </li>
          </ul>
        </div>
        
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

  // Render 5-phased form
  const renderPhasedForm = () => {
    if (!showRegistrationForm) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 bg-white z-10">
            <h2 className="text-xl font-bold">Driver Registration</h2>
            <button onClick={handleClose} className="text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-6">
            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex justify-between mb-2">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div 
                    key={step} 
                    className={`flex items-center justify-center h-8 w-8 rounded-full ${
                      step === formPhase ? 'bg-violet-600 text-white' : 
                      step < formPhase ? 'bg-green-500 text-white' : 'bg-gray-200'
                    }`}
                  >
                    {step < formPhase ? <Check size={16} /> : step}
                  </div>
                ))}
              </div>
              <div className="overflow-hidden rounded-full bg-gray-200">
                <div 
                  className="h-2 bg-violet-600 transition-all" 
                  style={{ width: `${(formPhase / 5) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>Personal Info</span>
                <span>Identification</span>
                <span>Vehicle</span>
                <span>Documents</span>
                <span>Verification</span>
              </div>
            </div>
            
            <form>
              {formPhase === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Personal Information</h3>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Full Name</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-gray-300 rounded-md" 
                      value={formData.fullName || ''}
                      onChange={(e) => handleFormChange('fullName', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Phone Number</label>
                    <input 
                      type="tel" 
                      className="w-full p-2 border border-gray-300 rounded-md" 
                      value={formData.phoneNumber || ''}
                      onChange={(e) => handleFormChange('phoneNumber', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Address</label>
                    <textarea 
                      className="w-full p-2 border border-gray-300 rounded-md" 
                      value={formData.address || ''}
                      onChange={(e) => handleFormChange('address', e.target.value)}
                      rows={3}
                      required
                    ></textarea>
                  </div>
                </div>
              )}
              
              {formPhase === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Identification</h3>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">CNIC Number</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-gray-300 rounded-md" 
                      value={formData.cnicNumber || ''}
                      onChange={(e) => handleFormChange('cnicNumber', e.target.value)}
                      placeholder="00000-0000000-0"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Driver License Number</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-gray-300 rounded-md" 
                      value={formData.driverLicenseNumber || ''}
                      onChange={(e) => handleFormChange('driverLicenseNumber', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">CNIC Front</label>
                      <input 
                        type="file" 
                        className="w-full p-2 border border-gray-300 rounded-md" 
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFormChange('cnicFrontPhoto', e.target.files[0]);
                          }
                        }}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">CNIC Back</label>
                      <input 
                        type="file" 
                        className="w-full p-2 border border-gray-300 rounded-md" 
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFormChange('cnicBackPhoto', e.target.files[0]);
                          }
                        }}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {formPhase === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Vehicle Information</h3>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Vehicle Type</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={formData.vehicleType || 'Bike'}
                      onChange={(e) => handleFormChange('vehicleType', e.target.value)}
                      required
                    >
                      <option value="Bike">Bike</option>
                      <option value="Auto">Auto Rickshaw</option>
                      <option value="Car">Car</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Vehicle Registration Number</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-gray-300 rounded-md" 
                      value={formData.vehicleRegistrationNumber || ''}
                      onChange={(e) => handleFormChange('vehicleRegistrationNumber', e.target.value)}
                      placeholder="ABC-123"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Vehicle Model</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border border-gray-300 rounded-md" 
                        value={formData.vehicleModel || ''}
                        onChange={(e) => handleFormChange('vehicleModel', e.target.value)}
                        placeholder="e.g. Honda 125"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Vehicle Color</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border border-gray-300 rounded-md" 
                        value={formData.vehicleColor || ''}
                        onChange={(e) => handleFormChange('vehicleColor', e.target.value)}
                        placeholder="e.g. Black"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {formPhase === 4 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Documents Upload</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Driver License Front</label>
                      <input 
                        type="file" 
                        className="w-full p-2 border border-gray-300 rounded-md" 
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFormChange('driverLicenseFrontPhoto', e.target.files[0]);
                          }
                        }}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Driver License Back</label>
                      <input 
                        type="file" 
                        className="w-full p-2 border border-gray-300 rounded-md" 
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFormChange('driverLicenseBackPhoto', e.target.files[0]);
                          }
                        }}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Vehicle Registration</label>
                    <input 
                      type="file" 
                      className="w-full p-2 border border-gray-300 rounded-md" 
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFormChange('vehicleRegistrationPhoto', e.target.files[0]);
                        }
                      }}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Vehicle Photo</label>
                    <input 
                      type="file" 
                      className="w-full p-2 border border-gray-300 rounded-md" 
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFormChange('vehiclePhoto', e.target.files[0]);
                        }
                      }}
                      required
                    />
                  </div>
                </div>
              )}
              
              {formPhase === 5 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Verification</h3>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Selfie Photo</label>
                    <input 
                      type="file" 
                      className="w-full p-2 border border-gray-300 rounded-md" 
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFormChange('selfiePhoto', e.target.files[0]);
                        }
                      }}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Selfie with CNIC</label>
                    <input 
                      type="file" 
                      className="w-full p-2 border border-gray-300 rounded-md" 
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFormChange('selfieWithCNIC', e.target.files[0]);
                        }
                      }}
                      required
                    />
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-blue-800 text-sm">
                      By submitting this application, you agree to our terms and conditions for drivers. 
                      Your application will be reviewed within 3-5 business days.
                    </p>
                  </div>
                  
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="agree" 
                      className="mr-2" 
                      checked={formData.agreedToTerms || false}
                      onChange={(e) => handleFormChange('agreedToTerms', e.target.checked)}
                      required
                    />
                    <label htmlFor="agree" className="text-sm">
                      I agree to the <a href="#" className="text-blue-600">Terms and Conditions</a>
                    </label>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between mt-8">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={formPhase > 1 ? prevPhase : handleClose}
                >
                  {formPhase > 1 ? 'Previous' : 'Cancel'}
                </Button>
                
                {formPhase < 5 ? (
                  <Button 
                    type="button" 
                    onClick={nextPhase}
                  >
                    Next
                  </Button>
                ) : (
                  <Button 
                    type="button"
                    onClick={() => handleSubmit(formData as DriverDocument)}
                    disabled={loading || !formData.agreedToTerms}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Application'
                    )}
                  </Button>
                )}
              </div>
            </form>
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
      return renderPhasedForm();
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
                onClick={() => navigate('/driver-dashboard')}
              >
                Go to Driver Dashboard
              </Button>
            </div>
            
            {hasDeposit ? (
              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm mb-6">
                <h3 className="text-xl font-bold mb-4">Ready to Drive!</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Your account is fully verified</p>
                      <p className="text-sm text-gray-500">You can start accepting ride requests</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <Wallet className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Security deposit confirmed</p>
                      <p className="text-sm text-gray-500">RS {walletBalance.toFixed(0)} available in your wallet</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
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
                {hasSubmittedApplication ? 'Application Already Submitted' : 'Submit Application'}
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
        {renderPhasedForm()}
      </div>
    </div>
  );
};

export default OfficialDriver;
