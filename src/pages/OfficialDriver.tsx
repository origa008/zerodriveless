
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  submitDriverRegistration, 
  uploadDriverDocument,
  getDriverRegistrationStatus,
  subscribeToDriverRegistration
} from '@/lib/utils/driverUtils';
import { DriverDocument } from '@/lib/types';
import { 
  UserRound, ArrowLeft, Check, AlertTriangle, CheckCircle, 
  Car, Bike, FileText, Upload, Loader2, X, ArrowRight
} from 'lucide-react';

const OfficialDriver: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [registrationStatus, setRegistrationStatus] = useState<string | null>(null);
  const [hasSubmittedApplication, setHasSubmittedApplication] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [currentFormStep, setCurrentFormStep] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState<DriverDocument>({
    fullName: '',
    phoneNumber: '',
    cnicNumber: '',
    vehicleType: 'Bike',
    vehicleRegistrationNumber: '',
    vehicleModel: '',
    vehicleColor: '',
    driverLicenseNumber: '',
    address: '',
    agreedToTerms: false
  });
  
  const [documents, setDocuments] = useState<{
    cnicFront?: File;
    cnicBack?: File;
    driverLicenseFront?: File;
    driverLicenseBack?: File;
    vehicleRegistration?: File;
    vehiclePhoto?: File;
    selfieWithCNIC?: File;
    selfiePhoto?: File;
  }>({});
  
  const [documentNames, setDocumentNames] = useState<{
    cnicFront?: string;
    cnicBack?: string;
    driverLicenseFront?: string;
    driverLicenseBack?: string;
    vehicleRegistration?: string;
    vehiclePhoto?: string;
    selfieWithCNIC?: string;
    selfiePhoto?: string;
  }>({});

  const checkRegistrationStatus = useCallback(async () => {
    if (!user?.id) return;
    
    console.log("Checking driver registration status for user:", user.id);
    const { status, details } = await getDriverRegistrationStatus(user.id);
    console.log("Driver status:", status, "Details:", details);
    
    // Check if user has submitted an application
    setHasSubmittedApplication(!!status);
    setRegistrationStatus(status);
    
    setLoading(false);
  }, [user?.id]);
  
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
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value 
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDocuments(prev => ({ 
        ...prev, 
        [docType]: file 
      }));
      setDocumentNames(prev => ({ 
        ...prev, 
        [docType]: file.name 
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Validate form data
      if (!formData.agreedToTerms) {
        toast({
          title: "Agreement Required",
          description: "You must agree to the terms and conditions",
          duration: 3000
        });
        setLoading(false);
        return;
      }
      
      if (!user?.id) {
        throw new Error("User ID not found");
      }
      
      // Upload all documents to Supabase storage
      const documentUrls: Record<string, string> = {};
      const uploadPromises = [];
      
      if (documents.cnicFront) {
        uploadPromises.push(
          uploadDriverDocument(user.id, documents.cnicFront, 'cnic-front')
            .then(({ url }) => {
              if (url) documentUrls.cnicFront = url;
            })
        );
      }
      
      if (documents.cnicBack) {
        uploadPromises.push(
          uploadDriverDocument(user.id, documents.cnicBack, 'cnic-back')
            .then(({ url }) => {
              if (url) documentUrls.cnicBack = url;
            })
        );
      }
      
      if (documents.driverLicenseFront) {
        uploadPromises.push(
          uploadDriverDocument(user.id, documents.driverLicenseFront, 'license-front')
            .then(({ url }) => {
              if (url) documentUrls.licenseFront = url;
            })
        );
      }
      
      if (documents.driverLicenseBack) {
        uploadPromises.push(
          uploadDriverDocument(user.id, documents.driverLicenseBack, 'license-back')
            .then(({ url }) => {
              if (url) documentUrls.licenseBack = url;
            })
        );
      }
      
      if (documents.vehicleRegistration) {
        uploadPromises.push(
          uploadDriverDocument(user.id, documents.vehicleRegistration, 'vehicle-registration')
            .then(({ url }) => {
              if (url) documentUrls.vehicleRegistration = url;
            })
        );
      }
      
      if (documents.vehiclePhoto) {
        uploadPromises.push(
          uploadDriverDocument(user.id, documents.vehiclePhoto, 'vehicle-photo')
            .then(({ url }) => {
              if (url) documentUrls.vehiclePhoto = url;
            })
        );
      }
      
      if (documents.selfieWithCNIC) {
        uploadPromises.push(
          uploadDriverDocument(user.id, documents.selfieWithCNIC, 'selfie-with-cnic')
            .then(({ url }) => {
              if (url) documentUrls.selfieWithCNIC = url;
            })
        );
      }
      
      if (documents.selfiePhoto) {
        uploadPromises.push(
          uploadDriverDocument(user.id, documents.selfiePhoto, 'selfie')
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
          fullName: formData.fullName,
          cnicNumber: formData.cnicNumber,
          vehicleRegistrationNumber: formData.vehicleRegistrationNumber,
          vehicleType: formData.vehicleType || 'Bike',
          vehicleModel: formData.vehicleModel,
          vehicleColor: formData.vehicleColor,
          driverLicenseNumber: formData.driverLicenseNumber,
          email: user.email
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
  
  const nextStep = () => {
    // Validate current step
    if (currentFormStep === 0) {
      if (!formData.fullName || !formData.phoneNumber || !formData.address) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          duration: 3000
        });
        return;
      }
    } else if (currentFormStep === 1) {
      if (!formData.cnicNumber || !documents.cnicFront || !documents.cnicBack) {
        toast({
          title: "Missing Documents",
          description: "Please provide your CNIC information",
          duration: 3000
        });
        return;
      }
    } else if (currentFormStep === 2) {
      if (!formData.driverLicenseNumber || !documents.driverLicenseFront || !documents.driverLicenseBack) {
        toast({
          title: "Missing Documents",
          description: "Please provide your driver license information",
          duration: 3000
        });
        return;
      }
    } else if (currentFormStep === 3) {
      if (!formData.vehicleType || !formData.vehicleRegistrationNumber || 
          !formData.vehicleModel || !formData.vehicleColor || 
          !documents.vehicleRegistration || !documents.vehiclePhoto) {
        toast({
          title: "Missing Information",
          description: "Please provide complete vehicle information",
          duration: 3000
        });
        return;
      }
    }
    
    setCurrentFormStep(prev => prev + 1);
  };
  
  const prevStep = () => {
    setCurrentFormStep(prev => Math.max(0, prev - 1));
  };

  const renderFileInput = (
    id: string, 
    label: string, 
    docType: keyof typeof documentNames, 
    required: boolean = true
  ) => (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">
        {label} {required && '*'}
      </label>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        <input
          type="file"
          id={id}
          className="hidden"
          accept="image/*"
          onChange={(e) => handleFileChange(e, docType)}
          required={required}
        />
        <label
          htmlFor={id}
          className="flex flex-col items-center justify-center cursor-pointer"
        >
          {documentNames[docType] ? (
            <div className="text-center">
              <div className="bg-green-100 h-10 w-10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Check className="text-green-500" size={20} />
              </div>
              <p className="text-green-600 font-medium text-sm">{documentNames[docType]}</p>
              <p className="text-xs text-gray-500 mt-1">Click to replace</p>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-gray-500 text-sm">Click to upload</p>
              <p className="text-gray-400 text-xs mt-1">JPG, PNG or PDF</p>
            </>
          )}
        </label>
      </div>
    </div>
  );

  const renderFormStep = () => {
    switch (currentFormStep) {
      case 0:
        return (
          <>
            <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg p-3"
                  placeholder="Enter your full name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number *</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg p-3"
                  placeholder="e.g., 03001234567"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Address *</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg p-3"
                  placeholder="Your current residential address"
                  rows={3}
                  required
                />
              </div>
            </div>
          </>
        );
      case 1:
        return (
          <>
            <h3 className="text-lg font-semibold mb-4">CNIC Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">CNIC Number *</label>
                <input
                  type="text"
                  name="cnicNumber"
                  value={formData.cnicNumber}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg p-3"
                  placeholder="e.g., 12345-6789012-3"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderFileInput('cnicFront', 'CNIC Front Side', 'cnicFront')}
                {renderFileInput('cnicBack', 'CNIC Back Side', 'cnicBack')}
              </div>
            </div>
          </>
        );
      case 2:
        return (
          <>
            <h3 className="text-lg font-semibold mb-4">Driver License Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Driver License Number *</label>
                <input
                  type="text"
                  name="driverLicenseNumber"
                  value={formData.driverLicenseNumber}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg p-3"
                  placeholder="Enter driver license number"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderFileInput('driverLicenseFront', 'Driver License Front', 'driverLicenseFront')}
                {renderFileInput('driverLicenseBack', 'Driver License Back', 'driverLicenseBack')}
              </div>
            </div>
          </>
        );
      case 3:
        return (
          <>
            <h3 className="text-lg font-semibold mb-4">Vehicle Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Vehicle Type *</label>
                <select
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg p-3"
                  required
                >
                  <option value="Bike">Bike</option>
                  <option value="Car">Car</option>
                  <option value="Rickshaw">Rickshaw</option>
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Vehicle Model *</label>
                  <input
                    type="text"
                    name="vehicleModel"
                    value={formData.vehicleModel}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg p-3"
                    placeholder="e.g., Honda 125"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Vehicle Color *</label>
                  <input
                    type="text"
                    name="vehicleColor"
                    value={formData.vehicleColor}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg p-3"
                    placeholder="e.g., Red"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Vehicle Registration Number *</label>
                <input
                  type="text"
                  name="vehicleRegistrationNumber"
                  value={formData.vehicleRegistrationNumber}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg p-3"
                  placeholder="e.g., ABC-123"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderFileInput('vehicleRegistration', 'Vehicle Registration', 'vehicleRegistration')}
                {renderFileInput('vehiclePhoto', 'Vehicle Photo', 'vehiclePhoto')}
              </div>
            </div>
          </>
        );
      case 4:
        return (
          <>
            <h3 className="text-lg font-semibold mb-4">Verification Photos</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderFileInput('selfieWithCNIC', 'Selfie with CNIC', 'selfieWithCNIC')}
                {renderFileInput('selfiePhoto', 'Profile Photo', 'selfiePhoto')}
              </div>
              
              <div className="mt-6">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="agreedToTerms"
                    name="agreedToTerms"
                    checked={formData.agreedToTerms}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                  <label htmlFor="agreedToTerms" className="ml-2 text-sm text-gray-600">
                    I confirm that all information provided is accurate and I agree to the terms and conditions of ZeroDrive.
                    I understand that my application will be reviewed and a security deposit may be required.
                  </label>
                </div>
              </div>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  const renderMultiStepForm = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-auto">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
          <button 
            onClick={() => setShowRegistrationForm(false)}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
          
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Driver Registration</h2>
            <div className="flex justify-between mt-4">
              {[0, 1, 2, 3, 4].map((step) => (
                <div 
                  key={step}
                  className={`flex flex-col items-center justify-center ${step === currentFormStep ? 'text-violet-600' : 'text-gray-400'}`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center mb-1 ${step === currentFormStep ? 'bg-violet-100 border-2 border-violet-500' : 'bg-gray-100'}`}>
                    {step < currentFormStep ? <Check size={16} className="text-green-500" /> : step + 1}
                  </div>
                  <div className="text-xs">
                    {step === 0 && 'Personal'}
                    {step === 1 && 'CNIC'}
                    {step === 2 && 'License'}
                    {step === 3 && 'Vehicle'}
                    {step === 4 && 'Verify'}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            {renderFormStep()}
            
            <div className="flex justify-between mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentFormStep === 0}
              >
                Back
              </Button>
              
              {currentFormStep < 4 ? (
                <Button 
                  type="button"
                  className="bg-violet-600 hover:bg-violet-700"
                  onClick={nextStep}
                >
                  Next <ArrowRight size={16} className="ml-1" />
                </Button>
              ) : (
                <Button 
                  type="submit"
                  className="bg-violet-600 hover:bg-violet-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : 'Submit Application'}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderRegistrationStatus = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-violet-700" />
            <p className="text-gray-600">Loading driver information...</p>
          </div>
        </div>
      );
    }
    
    if (showRegistrationForm) {
      return renderMultiStepForm();
    }
    
    switch (registrationStatus) {
      case 'pending':
        return (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center mb-6">
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
        );
      case 'approved':
        return (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <div className="flex items-center mb-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mr-3">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-green-600">Driver Account Approved</h2>
                <p className="text-sm text-gray-600">Your application has been approved by our team</p>
              </div>
            </div>
            
            <div className="flex gap-4 mb-6">
              <div className="flex-1 bg-violet-50 rounded-xl p-4 text-center">
                <Car size={32} className="mx-auto mb-2 text-violet-700" />
                <p className="text-sm font-medium">Car</p>
              </div>
              <div className="flex-1 bg-violet-50 rounded-xl p-4 text-center">
                <Bike size={32} className="mx-auto mb-2 text-violet-700" />
                <p className="text-sm font-medium">Bike</p>
              </div>
            </div>
            
            <Button
              className="w-full bg-black text-white hover:bg-gray-800 py-3 text-lg rounded-xl"
              onClick={() => navigate('/ride-requests')}
            >
              Start Accepting Rides
            </Button>
          </div>
        );
      case 'rejected':
        return (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center mb-6">
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
        );
      default:
        return (
          <>
            <div className="bg-gradient-to-br from-violet-500 to-violet-700 text-white p-6 rounded-t-xl">
              <h1 className="text-3xl font-bold">Official Driver Program</h1>
              <p className="mt-2 text-white/80">Join our certified driver program and earn more</p>
            </div>
            
            <div className="bg-white rounded-b-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-6">Become an Official Driver</h2>
              
              <div className="mb-8 bg-gray-50 p-6 rounded-xl">
                <h3 className="text-xl font-semibold mb-4">Benefits</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Check className="text-green-500 mr-2" />
                    <p>Priority access to high-value ride requests</p>
                  </div>
                  <div className="flex items-center">
                    <Check className="text-green-500 mr-2" />
                    <p>Lower platform fees (0.5% vs 1%)</p>
                  </div>
                  <div className="flex items-center">
                    <Check className="text-green-500 mr-2" />
                    <p>Exclusive driver insurance coverage</p>
                  </div>
                  <div className="flex items-center">
                    <Check className="text-green-500 mr-2" />
                    <p>Daily payment settlement</p>
                  </div>
                </div>
              </div>
              
              <div className="mb-8 bg-gray-50 p-6 rounded-xl">
                <h3 className="text-xl font-semibold mb-4">Requirements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Driver</h4>
                    <ul className="space-y-2 text-gray-600 text-sm">
                      <li>• Valid Pakistani driving license (2+ years)</li>
                      <li>• Minimum age of 21 years</li>
                      <li>• Clear background check</li>
                      <li>• Smartphone with Android 8.0+ or iOS 13+</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Vehicle</h4>
                    <ul className="space-y-2 text-gray-600 text-sm">
                      <li>• Model year 2015 or newer</li>
                      <li>• Good vehicle condition</li>
                      <li>• Valid registration and insurance</li>
                      <li>• Pass vehicle inspection</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="mb-8 bg-gray-50 p-6 rounded-xl">
                <h3 className="text-xl font-semibold mb-4">Required Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 text-gray-600 text-sm">
                    <p>• CNIC (front and back)</p>
                    <p>• Driving license (front and back)</p>
                    <p>• Vehicle registration certificate</p>
                  </div>
                  <div className="space-y-2 text-gray-600 text-sm">
                    <p>• Vehicle photos</p>
                    <p>• Selfie photo holding CNIC</p>
                    <p>• Clear profile photo</p>
                  </div>
                </div>
              </div>
              
              <Button 
                size="lg"
                className="w-full bg-violet-600 hover:bg-violet-700 text-white py-6 text-lg"
                onClick={() => setShowRegistrationForm(true)}
                disabled={hasSubmittedApplication}
              >
                <FileText className="mr-2" size={20} />
                {hasSubmittedApplication ? 'Application Already Submitted' : 'Start Registration'}
              </Button>
            </div>
          </>
        );
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <button onClick={() => navigate('/')} className="absolute top-4 left-4 flex items-center p-2 z-10">
        <ArrowLeft size={20} className="mr-1" />
        Back
      </button>
      
      <div className="container mx-auto px-4 py-8">
        {renderRegistrationStatus()}
      </div>
    </div>
  );
};

export default OfficialDriver;
