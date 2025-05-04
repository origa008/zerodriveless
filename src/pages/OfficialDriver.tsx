import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { submitDriverRegistration, uploadDriverDocument, getDriverRegistrationStatus, subscribeToDriverRegistration } from '@/lib/utils/driverUtils';
import { DriverDocument } from '@/lib/types';
import { UserRound, ArrowLeft, Check, AlertTriangle, CheckCircle, Car, Bike, FileText, Upload, Loader2, X, ArrowRight, Clock, ShieldAlert, ShieldCheck } from 'lucide-react';

// Define initialDocumentState first before using it
const initialDocumentState: DriverDocument = {
  id: '',
  type: 'driver_application',
  file: null,
  preview: null,
  status: 'pending',
  fullName: '',
  phoneNumber: '',
  cnicNumber: '',
  vehicleType: '',
  vehicleRegistrationNumber: '',
  vehicleModel: '',
  vehicleColor: '',
  driverLicenseNumber: '',
  address: '',
  agreedToTerms: false
};

const OfficialDriver: React.FC = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(true);
  const [registrationStatus, setRegistrationStatus] = useState<string | null>(null);
  const [hasSubmittedApplication, setHasSubmittedApplication] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [currentFormStep, setCurrentFormStep] = useState(0);

  // Form state
  const [formData, setFormData] = useState<DriverDocument>(initialDocumentState);
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
    const {
      status,
      details
    } = await getDriverRegistrationStatus(user.id);
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
    const unsubscribe = subscribeToDriverRegistration(user.id, newStatus => {
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
    const {
      name,
      value,
      type
    } = e.target as HTMLInputElement;
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
        uploadPromises.push(uploadDriverDocument(user.id, documents.cnicFront, 'cnic-front').then(({
          url
        }) => {
          if (url) documentUrls.cnicFront = url;
        }));
      }
      if (documents.cnicBack) {
        uploadPromises.push(uploadDriverDocument(user.id, documents.cnicBack, 'cnic-back').then(({
          url
        }) => {
          if (url) documentUrls.cnicBack = url;
        }));
      }
      if (documents.driverLicenseFront) {
        uploadPromises.push(uploadDriverDocument(user.id, documents.driverLicenseFront, 'license-front').then(({
          url
        }) => {
          if (url) documentUrls.licenseFront = url;
        }));
      }
      if (documents.driverLicenseBack) {
        uploadPromises.push(uploadDriverDocument(user.id, documents.driverLicenseBack, 'license-back').then(({
          url
        }) => {
          if (url) documentUrls.licenseBack = url;
        }));
      }
      if (documents.vehicleRegistration) {
        uploadPromises.push(uploadDriverDocument(user.id, documents.vehicleRegistration, 'vehicle-registration').then(({
          url
        }) => {
          if (url) documentUrls.vehicleRegistration = url;
        }));
      }
      if (documents.vehiclePhoto) {
        uploadPromises.push(uploadDriverDocument(user.id, documents.vehiclePhoto, 'vehicle-photo').then(({
          url
        }) => {
          if (url) documentUrls.vehiclePhoto = url;
        }));
      }
      if (documents.selfieWithCNIC) {
        uploadPromises.push(uploadDriverDocument(user.id, documents.selfieWithCNIC, 'selfie-with-cnic').then(({
          url
        }) => {
          if (url) documentUrls.selfieWithCNIC = url;
        }));
      }
      if (documents.selfiePhoto) {
        uploadPromises.push(uploadDriverDocument(user.id, documents.selfiePhoto, 'selfie').then(({
          url
        }) => {
          if (url) documentUrls.selfiePhoto = url;
        }));
      }

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);

      // Submit driver registration
      const {
        success,
        error
      } = await submitDriverRegistration(user.id, documentUrls, {
        fullName: formData.fullName,
        cnicNumber: formData.cnicNumber,
        vehicleRegistrationNumber: formData.vehicleRegistrationNumber,
        vehicleType: formData.vehicleType || 'Bike',
        vehicleModel: formData.vehicleModel,
        vehicleColor: formData.vehicleColor,
        driverLicenseNumber: formData.driverLicenseNumber,
        email: user.email
      });
      if (success) {
        toast({
          title: "Application Submitted",
          description: "Your driver application has been submitted successfully and is under review.",
          duration: 5000
        });
        setHasSubmittedApplication(true);
        setRegistrationStatus('pending');
        setShowRegistrationForm(false);
      } else {
        throw new Error(error || "Failed to submit application");
      }
    } catch (error: any) {
      console.error("Driver registration error:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "An error occurred during submission",
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
      if (!formData.vehicleType || !formData.vehicleRegistrationNumber || !formData.vehicleModel || !formData.vehicleColor || !documents.vehicleRegistration || !documents.vehiclePhoto) {
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
  const renderFileInput = (id: string, label: string, docType: keyof typeof documentNames, required: boolean = true) => <div className="mb-4">
      <label className="block text-sm font-medium mb-1">
        {label} {required && '*'}
      </label>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        <input type="file" id={id} className="hidden" accept="image/*" onChange={e => handleFileChange(e, docType)} required={required} />
        <label htmlFor={id} className="flex flex-col items-center justify-center cursor-pointer">
          {documentNames[docType] ? <div className="text-center">
              <div className="bg-green-100 h-10 w-10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Check className="text-green-500" size={20} />
              </div>
              <p className="text-green-600 font-medium text-sm">{documentNames[docType]}</p>
              <p className="text-xs text-gray-500 mt-1">Click to replace</p>
            </div> : <>
              <Upload className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-gray-500 text-sm">Click to upload</p>
              <p className="text-gray-400 text-xs mt-1">JPG, PNG or PDF</p>
            </>}
        </label>
      </div>
    </div>;
  const renderFormStep = () => {
    switch (currentFormStep) {
      case 0:
        return <>
            <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg p-3" placeholder="Enter your full name" required />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number *</label>
                <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg p-3" placeholder="e.g., 03001234567" required />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Address *</label>
                <textarea name="address" value={formData.address} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg p-3" placeholder="Your current residential address" rows={3} required />
              </div>
            </div>
          </>;
      case 1:
        return <>
            <h3 className="text-lg font-semibold mb-4">CNIC Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">CNIC Number *</label>
                <input type="text" name="cnicNumber" value={formData.cnicNumber} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg p-3" placeholder="e.g., 12345-6789012-3" required />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderFileInput('cnicFront', 'CNIC Front Side', 'cnicFront')}
                {renderFileInput('cnicBack', 'CNIC Back Side', 'cnicBack')}
              </div>
            </div>
          </>;
      case 2:
        return <>
            <h3 className="text-lg font-semibold mb-4">Driver License Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Driver License Number *</label>
                <input type="text" name="driverLicenseNumber" value={formData.driverLicenseNumber} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg p-3" placeholder="Enter driver license number" required />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderFileInput('driverLicenseFront', 'Driver License Front', 'driverLicenseFront')}
                {renderFileInput('driverLicenseBack', 'Driver License Back', 'driverLicenseBack')}
              </div>
            </div>
          </>;
      case 3:
        return <>
            <h3 className="text-lg font-semibold mb-4">Vehicle Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Vehicle Type *</label>
                <select name="vehicleType" value={formData.vehicleType} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg p-3" required>
                  <option value="Bike">Bike</option>
                  <option value="Car">Car</option>
                  <option value="Rickshaw">Rickshaw</option>
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Vehicle Model *</label>
                  <input type="text" name="vehicleModel" value={formData.vehicleModel} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg p-3" placeholder="e.g., Honda 125" required />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Vehicle Color *</label>
                  <input type="text" name="vehicleColor" value={formData.vehicleColor} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg p-3" placeholder="e.g., Red" required />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Vehicle Registration Number *</label>
                <input type="text" name="vehicleRegistrationNumber" value={formData.vehicleRegistrationNumber} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg p-3" placeholder="e.g., ABC-123" required />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderFileInput('vehicleRegistration', 'Vehicle Registration', 'vehicleRegistration')}
                {renderFileInput('vehiclePhoto', 'Vehicle Photo', 'vehiclePhoto')}
              </div>
            </div>
          </>;
      case 4:
        return <>
            <h3 className="text-lg font-semibold mb-4">Verification Photos</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderFileInput('selfieWithCNIC', 'Selfie with CNIC', 'selfieWithCNIC')}
                {renderFileInput('selfiePhoto', 'Profile Photo', 'selfiePhoto')}
              </div>
              
              <div className="mt-6">
                <div className="flex items-start">
                  <input type="checkbox" id="agreedToTerms" name="agreedToTerms" checked={formData.agreedToTerms} onChange={handleInputChange} className="mt-1" />
                  <label htmlFor="agreedToTerms" className="ml-2 text-sm text-gray-600">
                    I confirm that all information provided is accurate and I agree to the terms and conditions of ZeroDrive.
                    I understand that my application will be reviewed and a security deposit may be required.
                  </label>
                </div>
              </div>
            </div>
          </>;
      default:
        return null;
    }
  };
  const renderMultiStepForm = () => {
    return <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-auto">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
          <button onClick={() => setShowRegistrationForm(false)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
          
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Driver Registration</h2>
            <div className="flex justify-between mt-4">
              {[0, 1, 2, 3, 4].map(step => <div key={step} className={`flex flex-col items-center justify-center ${step === currentFormStep ? 'text-violet-600' : 'text-gray-400'}`}>
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
                </div>)}
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            {renderFormStep()}
            
            <div className="flex justify-between mt-8">
              <Button type="button" variant="outline" onClick={prevStep} disabled={currentFormStep === 0}>
                Back
              </Button>
              
              {currentFormStep < 4 ? <Button type="button" className="bg-violet-600 hover:bg-violet-700" onClick={nextStep}>
                  Next <ArrowRight size={16} className="ml-1" />
                </Button> : <Button type="submit" className="bg-violet-600 hover:bg-violet-700" disabled={loading}>
                  {loading ? <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </> : 'Submit Application'}
                </Button>}
            </div>
          </form>
        </div>
      </div>;
  };

  // New function to render status badge
  const renderStatusBadge = () => {
    if (!registrationStatus) return null;
    switch (registrationStatus) {
      case 'pending':
        return <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-center">
            <Clock className="h-6 w-6 text-amber-500 mr-3" />
            <div>
              <h3 className="font-medium text-amber-700">Application Under Review</h3>
              <p className="text-sm text-amber-600">
                Your driver application is being reviewed by our team. This typically takes 1-2 business days.
              </p>
            </div>
          </div>;
      case 'approved':
        return <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center">
            <ShieldCheck className="h-6 w-6 text-green-500 mr-3" />
            <div>
              <h3 className="font-medium text-green-700">Application Approved</h3>
              <p className="text-sm text-green-600">
                Congratulations! Your application has been approved. You can now start accepting ride requests.
              </p>
            </div>
          </div>;
      case 'rejected':
        return <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center">
            <ShieldAlert className="h-6 w-6 text-red-500 mr-3" />
            <div>
              <h3 className="font-medium text-red-700">Application Rejected</h3>
              <p className="text-sm text-red-600">
                Unfortunately, your application was not approved. Please review our requirements and consider reapplying.
              </p>
            </div>
          </div>;
      default:
        return null;
    }
  };
  if (loading) {
    return <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin mb-4" />
        <p className="text-gray-500">Loading...</p>
      </div>;
  }
  return <div className="min-h-screen bg-white p-6">
      <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-left">OFFICIAL DRIVER</h1>
          <p className="text-gray-500 text-left">Join our network of professional drivers and make money</p>
        </div>
        
        {/* Always show status badge if application has been submitted */}
        {hasSubmittedApplication && renderStatusBadge()}
        
        {!hasSubmittedApplication && !showRegistrationForm && <div className="bg-gray-50 rounded-2xl p-8 mb-8 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
              <UserRound className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Become a Driver</h2>
            <p className="text-gray-600 mb-6">
              Drive with ZeroDriveless and earn money on your own schedule. 
              Set your own hours and be your own boss.
            </p>
            <Button size="lg" className="bg-primary text-white hover:bg-primary/90 w-full md:w-auto" onClick={() => setShowRegistrationForm(true)}>
              Apply Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>}
        
        {!hasSubmittedApplication && showRegistrationForm && renderMultiStepForm()}
        
        {hasSubmittedApplication && !showRegistrationForm && <div className="space-y-6">
            <h2 className="text-2xl font-bold">Documents & Details</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-medium mb-4">Next Steps</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Application submitted for review</span>
                  </li>
                  <li className="flex items-start">
                    {registrationStatus === 'approved' ? <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" /> : <Clock className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />}
                    <span>Background verification {registrationStatus === 'approved' ? 'completed' : 'in progress'}</span>
                  </li>
                  <li className="flex items-start">
                    {registrationStatus === 'approved' ? <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" /> : <Clock className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />}
                    <span>Document verification {registrationStatus === 'approved' ? 'completed' : 'in progress'}</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-medium mb-4">Account Status</h3>
                <div className="flex items-center mb-4">
                  {registrationStatus === 'approved' ? <>
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="font-medium">Active</span>
                    </> : registrationStatus === 'pending' ? <>
                      <div className="w-3 h-3 bg-amber-500 rounded-full mr-2"></div>
                      <span className="font-medium">Pending</span>
                    </> : <>
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      <span className="font-medium">Rejected</span>
                    </>}
                </div>
                <p className="text-sm text-gray-500">
                  {registrationStatus === 'approved' ? 'Your account is active. You can now start accepting ride requests.' : registrationStatus === 'pending' ? 'Your application is currently under review. This typically takes 1-2 business days.' : 'Your application was rejected. Please contact support for more information.'}
                </p>
              </div>
            </div>
            
            {registrationStatus === 'approved' && <div className="mt-8">
                <Button size="lg" className="bg-primary text-white hover:bg-primary/90" onClick={() => navigate('/ride-requests')}>
                  View Available Rides
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>}
          </div>}
      </div>
    </div>;
};
export default OfficialDriver;
