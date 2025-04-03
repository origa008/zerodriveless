
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, ArrowLeft, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DriverDocument } from '@/lib/types';

type DriverRegistrationProps = {
  onClose: () => void;
  onSubmit: (data: DriverDocument) => void;
};

const DriverRegistration: React.FC<DriverRegistrationProps> = ({ onClose, onSubmit }) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<DriverDocument>({
    fullName: '',
    phoneNumber: '',
    cnicNumber: '',
    vehicleRegistrationNumber: '',
  });

  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  
  const totalSteps = 5;
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof DriverDocument) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, [fieldName]: file }));
      setFileNames(prev => ({ ...prev, [fieldName]: file.name }));
    }
  };
  
  const nextStep = () => {
    if (step === 1) {
      // Validate personal info
      if (!formData.fullName || !formData.phoneNumber || !formData.cnicNumber) {
        toast({
          title: "Incomplete information",
          description: "Please fill in all required fields",
          duration: 3000
        });
        return;
      }
      
      if (formData.phoneNumber.length !== 11 || !/^\d+$/.test(formData.phoneNumber)) {
        toast({
          title: "Invalid phone number",
          description: "Please enter a valid 11-digit phone number",
          duration: 3000
        });
        return;
      }
      
      if (formData.cnicNumber.length !== 13 || !/^\d+$/.test(formData.cnicNumber)) {
        toast({
          title: "Invalid CNIC number",
          description: "Please enter a valid 13-digit CNIC number",
          duration: 3000
        });
        return;
      }
    } else if (step === 2) {
      // Validate CNIC photos
      if (!formData.cnicFrontPhoto || !formData.cnicBackPhoto) {
        toast({
          title: "Missing documents",
          description: "Please upload both front and back CNIC photos",
          duration: 3000
        });
        return;
      }
    } else if (step === 3) {
      // Validate license photos
      if (!formData.driverLicenseFrontPhoto || !formData.driverLicenseBackPhoto) {
        toast({
          title: "Missing documents",
          description: "Please upload both front and back driver license photos",
          duration: 3000
        });
        return;
      }
    } else if (step === 4) {
      // Validate vehicle info
      if (!formData.vehicleRegistrationNumber || !formData.vehicleRegistrationPhoto || !formData.vehiclePhoto) {
        toast({
          title: "Incomplete information",
          description: "Please provide all vehicle information and photos",
          duration: 3000
        });
        return;
      }
    }
    
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Submit form
      onSubmit(formData);
    }
  };
  
  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onClose();
    }
  };
  
  const renderStepContent = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Personal Information</h2>
            <p className="text-gray-500 text-sm mb-4">
              Please enter your details as they appear on your CNIC.
            </p>
            
            <div>
              <label className="block text-sm font-medium mb-1">Full Name (as per CNIC) *</label>
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
                placeholder="11-digit phone number"
                maxLength={11}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Format: 03001234567</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">CNIC Number *</label>
              <input
                type="text"
                name="cnicNumber"
                value={formData.cnicNumber}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg p-3"
                placeholder="13-digit CNIC number"
                maxLength={13}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Format: 3520212345678</p>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">CNIC Documents</h2>
            <p className="text-gray-500 text-sm mb-4">
              Upload clear photos of the front and back of your CNIC.
            </p>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-medium mb-2">CNIC Front *</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="cnicFront"
                  onChange={(e) => handleFileChange(e, 'cnicFrontPhoto')}
                />
                <label
                  htmlFor="cnicFront"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-50"
                >
                  {formData.cnicFrontPhoto ? (
                    <div className="text-center">
                      <Check size={32} className="mx-auto mb-2 text-green-500" />
                      <p className="text-green-600 font-medium">{fileNames.cnicFrontPhoto}</p>
                      <p className="text-sm text-gray-500 mt-1">Click to replace</p>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} className="text-gray-400 mb-2" />
                      <p className="text-gray-500">Click to upload CNIC front</p>
                    </>
                  )}
                </label>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-medium mb-2">CNIC Back *</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="cnicBack"
                  onChange={(e) => handleFileChange(e, 'cnicBackPhoto')}
                />
                <label
                  htmlFor="cnicBack"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-50"
                >
                  {formData.cnicBackPhoto ? (
                    <div className="text-center">
                      <Check size={32} className="mx-auto mb-2 text-green-500" />
                      <p className="text-green-600 font-medium">{fileNames.cnicBackPhoto}</p>
                      <p className="text-sm text-gray-500 mt-1">Click to replace</p>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} className="text-gray-400 mb-2" />
                      <p className="text-gray-500">Click to upload CNIC back</p>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Driver License Documents</h2>
            <p className="text-gray-500 text-sm mb-4">
              Upload clear photos of your driver license.
            </p>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-medium mb-2">License Front *</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="licenseFront"
                  onChange={(e) => handleFileChange(e, 'driverLicenseFrontPhoto')}
                />
                <label
                  htmlFor="licenseFront"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-50"
                >
                  {formData.driverLicenseFrontPhoto ? (
                    <div className="text-center">
                      <Check size={32} className="mx-auto mb-2 text-green-500" />
                      <p className="text-green-600 font-medium">{fileNames.driverLicenseFrontPhoto}</p>
                      <p className="text-sm text-gray-500 mt-1">Click to replace</p>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} className="text-gray-400 mb-2" />
                      <p className="text-gray-500">Click to upload license front</p>
                    </>
                  )}
                </label>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-medium mb-2">License Back *</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="licenseBack"
                  onChange={(e) => handleFileChange(e, 'driverLicenseBackPhoto')}
                />
                <label
                  htmlFor="licenseBack"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-50"
                >
                  {formData.driverLicenseBackPhoto ? (
                    <div className="text-center">
                      <Check size={32} className="mx-auto mb-2 text-green-500" />
                      <p className="text-green-600 font-medium">{fileNames.driverLicenseBackPhoto}</p>
                      <p className="text-sm text-gray-500 mt-1">Click to replace</p>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} className="text-gray-400 mb-2" />
                      <p className="text-gray-500">Click to upload license back</p>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Vehicle Information</h2>
            <p className="text-gray-500 text-sm mb-4">
              Provide details about the vehicle you'll be using.
            </p>
            
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
            
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-medium mb-2">Vehicle Registration Document *</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="regDoc"
                  onChange={(e) => handleFileChange(e, 'vehicleRegistrationPhoto')}
                />
                <label
                  htmlFor="regDoc"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-50"
                >
                  {formData.vehicleRegistrationPhoto ? (
                    <div className="text-center">
                      <Check size={32} className="mx-auto mb-2 text-green-500" />
                      <p className="text-green-600 font-medium">{fileNames.vehicleRegistrationPhoto}</p>
                      <p className="text-sm text-gray-500 mt-1">Click to replace</p>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} className="text-gray-400 mb-2" />
                      <p className="text-gray-500">Upload registration document</p>
                    </>
                  )}
                </label>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-medium mb-2">Vehicle Photo *</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="vehiclePhoto"
                  onChange={(e) => handleFileChange(e, 'vehiclePhoto')}
                />
                <label
                  htmlFor="vehiclePhoto"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-50"
                >
                  {formData.vehiclePhoto ? (
                    <div className="text-center">
                      <Check size={32} className="mx-auto mb-2 text-green-500" />
                      <p className="text-green-600 font-medium">{fileNames.vehiclePhoto}</p>
                      <p className="text-sm text-gray-500 mt-1">Click to replace</p>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} className="text-gray-400 mb-2" />
                      <p className="text-gray-500">Upload vehicle photo</p>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>
        );
        
      case 5:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Personal Photos</h2>
            <p className="text-gray-500 text-sm mb-4">
              Please take the following photos for verification.
            </p>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-medium mb-2">Selfie with CNIC *</label>
              <p className="text-xs text-gray-500 mb-3">
                Hold your CNIC next to your face and take a photo.
              </p>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="selfieWithCNIC"
                  onChange={(e) => handleFileChange(e, 'selfieWithCNIC')}
                />
                <label
                  htmlFor="selfieWithCNIC"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-50"
                >
                  {formData.selfieWithCNIC ? (
                    <div className="text-center">
                      <Check size={32} className="mx-auto mb-2 text-green-500" />
                      <p className="text-green-600 font-medium">{fileNames.selfieWithCNIC}</p>
                      <p className="text-sm text-gray-500 mt-1">Click to replace</p>
                    </div>
                  ) : (
                    <>
                      <Camera size={32} className="text-gray-400 mb-2" />
                      <p className="text-gray-500">Take or upload a photo</p>
                    </>
                  )}
                </label>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-medium mb-2">Profile Selfie *</label>
              <p className="text-xs text-gray-500 mb-3">
                Take a clear photo of your face for your driver profile.
              </p>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="selfiePhoto"
                  onChange={(e) => handleFileChange(e, 'selfiePhoto')}
                />
                <label
                  htmlFor="selfiePhoto"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-50"
                >
                  {formData.selfiePhoto ? (
                    <div className="text-center">
                      <Check size={32} className="mx-auto mb-2 text-green-500" />
                      <p className="text-green-600 font-medium">{fileNames.selfiePhoto}</p>
                      <p className="text-sm text-gray-500 mt-1">Click to replace</p>
                    </div>
                  ) : (
                    <>
                      <Camera size={32} className="text-gray-400 mb-2" />
                      <p className="text-gray-500">Take or upload a photo</p>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-md mx-auto my-8">
        <div className="p-4 border-b border-gray-200 flex items-center">
          <button 
            onClick={prevStep}
            className="mr-2"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-medium">Driver Registration</h2>
        </div>
        
        <div className="p-6">
          {/* Progress indicator */}
          <div className="flex justify-between mb-6">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div 
                key={index} 
                className={`w-full h-1 rounded-full mx-0.5 ${index + 1 <= step ? 'bg-zerodrive-purple' : 'bg-gray-200'}`}
              />
            ))}
          </div>
          
          {renderStepContent()}
          
          <div className="mt-8 flex justify-end">
            <Button 
              onClick={nextStep}
              className="bg-zerodrive-purple text-white"
            >
              {step === totalSteps ? 'Submit Application' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverRegistration;
