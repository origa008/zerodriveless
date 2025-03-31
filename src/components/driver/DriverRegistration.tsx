
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Phone, 
  FileText, 
  Camera, 
  Car, 
  FileImage, 
  Check,
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface DriverRegistrationProps {
  onClose: () => void;
  onComplete: () => void;
}

const DriverRegistration: React.FC<DriverRegistrationProps> = ({ onClose, onComplete }) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    cnicNumber: '',
    vehicleType: 'bike',
    vehicleRegistrationNumber: '',
    // These would typically store file references
    cnicFront: null,
    cnicBack: null,
    drivingLicense: null,
    vehicleRegistration: null,
    vehiclePhoto: null,
    selfieWithCNIC: null,
    selfie: null
  });

  const totalSteps = 5;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectVehicleType = (type: string) => {
    setFormData(prev => ({ ...prev, vehicleType: type }));
  };

  const handleFileInput = (fieldName: string) => {
    // In a real app, this would handle file uploads
    // Here we're just simulating the process
    setFormData(prev => ({ ...prev, [fieldName]: 'file-uploaded' }));
    toast({
      title: "File uploaded",
      description: "Your document has been uploaded successfully.",
      duration: 2000
    });
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    } else {
      onClose();
    }
  };

  const handleSubmit = () => {
    // Here we'd submit the data to the backend
    toast({
      title: "Registration submitted",
      description: "Your driver registration has been submitted for review. We'll notify you once it's approved.",
      duration: 5000
    });
    onComplete();
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Personal Information</h3>
            
            <div>
              <label className="block text-sm font-medium mb-1">Full Name (as per CNIC)*</label>
              <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
                <User size={18} className="text-gray-500 mr-2" />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className="flex-1 outline-none"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number*</label>
              <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
                <Phone size={18} className="text-gray-500 mr-2" />
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="+92 300 1234567"
                  className="flex-1 outline-none"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">CNIC Number*</label>
              <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
                <FileText size={18} className="text-gray-500 mr-2" />
                <input
                  type="text"
                  name="cnicNumber"
                  value={formData.cnicNumber}
                  onChange={handleInputChange}
                  placeholder="00000-0000000-0"
                  className="flex-1 outline-none"
                  required
                />
              </div>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Identity Documents</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">CNIC Front Side*</label>
              <button 
                className="w-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 hover:bg-gray-50"
                onClick={() => handleFileInput('cnicFront')}
              >
                <Camera size={24} className="text-gray-500 mr-2" />
                <span>{formData.cnicFront ? 'Document Uploaded' : 'Upload Image'}</span>
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">CNIC Back Side*</label>
              <button 
                className="w-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 hover:bg-gray-50"
                onClick={() => handleFileInput('cnicBack')}
              >
                <Camera size={24} className="text-gray-500 mr-2" />
                <span>{formData.cnicBack ? 'Document Uploaded' : 'Upload Image'}</span>
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Driving License*</label>
              <button 
                className="w-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 hover:bg-gray-50"
                onClick={() => handleFileInput('drivingLicense')}
              >
                <Camera size={24} className="text-gray-500 mr-2" />
                <span>{formData.drivingLicense ? 'Document Uploaded' : 'Upload Image'}</span>
              </button>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Vehicle Information</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Vehicle Type*</label>
              <div className="flex space-x-3">
                <div 
                  className={`flex-1 border rounded-lg p-3 cursor-pointer transition-colors ${formData.vehicleType === 'bike' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                  onClick={() => handleSelectVehicleType('bike')}
                >
                  <div className="flex justify-center mb-2">
                    <img 
                      src="/lovable-uploads/debf7624-f989-4b17-a657-b4eb13735f8b.png" 
                      alt="Bike" 
                      className="h-16 object-contain" 
                    />
                  </div>
                  <p className="text-center">Bike</p>
                </div>
                
                <div 
                  className={`flex-1 border rounded-lg p-3 cursor-pointer transition-colors ${formData.vehicleType === 'auto' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                  onClick={() => handleSelectVehicleType('auto')}
                >
                  <div className="flex justify-center mb-2">
                    <img 
                      src="/lovable-uploads/413bd9ac-22fa-4c69-aa6c-991edcf8f3ff.png" 
                      alt="Auto" 
                      className="h-16 object-contain" 
                    />
                  </div>
                  <p className="text-center">Auto</p>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Vehicle Registration Number*</label>
              <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
                <Car size={18} className="text-gray-500 mr-2" />
                <input
                  type="text"
                  name="vehicleRegistrationNumber"
                  value={formData.vehicleRegistrationNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., ABC-123"
                  className="flex-1 outline-none"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Vehicle Registration Document*</label>
              <button 
                className="w-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 hover:bg-gray-50"
                onClick={() => handleFileInput('vehicleRegistration')}
              >
                <FileImage size={24} className="text-gray-500 mr-2" />
                <span>{formData.vehicleRegistration ? 'Document Uploaded' : 'Upload Image'}</span>
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Vehicle Photo*</label>
              <button 
                className="w-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 hover:bg-gray-50"
                onClick={() => handleFileInput('vehiclePhoto')}
              >
                <Camera size={24} className="text-gray-500 mr-2" />
                <span>{formData.vehiclePhoto ? 'Photo Uploaded' : 'Upload Photo'}</span>
              </button>
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Identity Verification</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Selfie with CNIC*</label>
              <button 
                className="w-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 hover:bg-gray-50"
                onClick={() => handleFileInput('selfieWithCNIC')}
              >
                <Camera size={24} className="text-gray-500 mr-2" />
                <span>{formData.selfieWithCNIC ? 'Photo Uploaded' : 'Take Selfie'}</span>
              </button>
              <p className="text-xs text-gray-500 mt-1">Please hold your CNIC next to your face</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Selfie*</label>
              <button 
                className="w-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 hover:bg-gray-50"
                onClick={() => handleFileInput('selfie')}
              >
                <Camera size={24} className="text-gray-500 mr-2" />
                <span>{formData.selfie ? 'Photo Uploaded' : 'Take Selfie'}</span>
              </button>
              <p className="text-xs text-gray-500 mt-1">Please ensure your face is clearly visible</p>
            </div>
          </div>
        );
      
      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Review & Submit</h3>
            
            <p className="text-gray-600 mb-3">
              Please review your information before submitting. Once submitted, our team will verify your details and approve your driver account.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Full Name:</span>
                <span className="font-medium">{formData.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">CNIC Number:</span>
                <span className="font-medium">{formData.cnicNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Vehicle Type:</span>
                <span className="font-medium capitalize">{formData.vehicleType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Registration Number:</span>
                <span className="font-medium">{formData.vehicleRegistrationNumber}</span>
              </div>
            </div>
            
            <p className="text-sm text-gray-600">
              By submitting, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Driver Registration</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex justify-between mb-6">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${i + 1 <= step ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {i + 1 < step ? <Check size={16} /> : i + 1}
              </div>
              {i < totalSteps - 1 && (
                <div className={`w-full h-1 ${i + 1 < step ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
              )}
            </div>
          ))}
        </div>
        
        {renderStepContent()}
        
        <div className="flex space-x-3 mt-6">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleBack}
          >
            {step === 1 ? 'Cancel' : (
              <>
                <ChevronLeft size={16} className="mr-1" />
                Back
              </>
            )}
          </Button>
          <Button 
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleNext}
          >
            {step === totalSteps ? 'Submit' : (
              <>
                Next
                <ChevronRight size={16} className="ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DriverRegistration;
