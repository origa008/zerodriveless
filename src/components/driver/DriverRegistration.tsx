
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Upload, Loader2 } from 'lucide-react';
import { DriverDocument } from '@/lib/types';

interface DriverRegistrationProps {
  onClose: () => void;
  onSubmit: (data: DriverDocument) => void;
}

const DriverRegistration: React.FC<DriverRegistrationProps> = ({ onClose, onSubmit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<DriverDocument>({
    fullName: '',
    phoneNumber: '',
    cnicNumber: '',
    vehicleType: 'Bike',
    vehicleRegistrationNumber: '',
    vehicleModel: '',  // Add this field
    vehicleColor: '',  // Add this field
    driverLicenseNumber: '',  // Add this field
    address: '',  // Add this field
    agreedToTerms: false  // Add this field
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    setIsLoading(true);
    
    try {
      const completeFormData: DriverDocument = {
        ...formData,
        cnicFrontPhoto: documents.cnicFront,
        cnicBackPhoto: documents.cnicBack,
        driverLicenseFrontPhoto: documents.driverLicenseFront,
        driverLicenseBackPhoto: documents.driverLicenseBack,
        vehicleRegistrationPhoto: documents.vehicleRegistration,
        vehiclePhoto: documents.vehiclePhoto,
        selfieWithCNIC: documents.selfieWithCNIC,
        selfiePhoto: documents.selfiePhoto
      };
      
      await onSubmit(completeFormData);
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Driver Registration</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-3">Upload Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderFileInput('cnicFront', 'CNIC Front Side', 'cnicFront')}
              {renderFileInput('cnicBack', 'CNIC Back Side', 'cnicBack')}
              {renderFileInput('driverLicenseFront', 'Driver License Front', 'driverLicenseFront')}
              {renderFileInput('driverLicenseBack', 'Driver License Back', 'driverLicenseBack')}
              {renderFileInput('vehicleRegistration', 'Vehicle Registration', 'vehicleRegistration')}
              {renderFileInput('vehiclePhoto', 'Vehicle Photo', 'vehiclePhoto')}
              {renderFileInput('selfieWithCNIC', 'Selfie with CNIC', 'selfieWithCNIC')}
              {renderFileInput('selfiePhoto', 'Selfie Photo', 'selfiePhoto')}
            </div>
          </div>
          
          <div className="mt-6">
            <p className="text-sm text-gray-500 mb-4">
              By submitting this application, I confirm that all information provided is accurate and I agree to the terms and conditions of ZeroDrive.
            </p>
            <div className="flex justify-end space-x-3">
              <Button 
                type="button" 
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-zerodrive-purple hover:bg-violet-800"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : 'Submit Application'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DriverRegistration;
