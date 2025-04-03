
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BottomNavigation from '@/components/layout/BottomNavigation';
import DriverRegistration from '@/components/driver/DriverRegistration';
import { useToast } from '@/hooks/use-toast';
import { DriverDocument } from '@/lib/types';
import { useAuth } from '@/lib/context/AuthContext';

const OfficialDriver: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  
  const handleSubmitDocuments = (data: DriverDocument) => {
    console.log('Driver registration data:', data);
    
    // In a real app, this would be sent to the backend
    toast({
      title: "Application submitted!",
      description: "We'll review your documents and get back to you within 3-5 business days.",
      duration: 5000
    });
    
    setShowRegistrationForm(false);
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-black text-white p-6">
        <button 
          onClick={() => navigate('/')}
          className="mb-4 flex items-center text-white"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back
        </button>
        
        <h1 className="text-2xl font-bold">Official Driver Program</h1>
        <p className="text-gray-300">Join our certified driver program</p>
      </div>
      
      <div className="p-6">
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-medium mb-2">Become an Official Driver</h2>
          <p className="text-gray-600 mb-4">
            The Official Driver Program gives you access to premium ride requests, 
            higher earnings, and exclusive benefits.
          </p>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-start">
              <Check size={20} className="mr-3 text-green-600 mt-1 flex-shrink-0" />
              <p className="text-gray-600">Priority access to high-value ride requests</p>
            </div>
            <div className="flex items-start">
              <Check size={20} className="mr-3 text-green-600 mt-1 flex-shrink-0" />
              <p className="text-gray-600">Lower platform fees (0.5% vs 1% for regular drivers)</p>
            </div>
            <div className="flex items-start">
              <Check size={20} className="mr-3 text-green-600 mt-1 flex-shrink-0" />
              <p className="text-gray-600">Exclusive driver insurance coverage</p>
            </div>
            <div className="flex items-start">
              <Check size={20} className="mr-3 text-green-600 mt-1 flex-shrink-0" />
              <p className="text-gray-600">Daily payment settlement</p>
            </div>
            <div className="flex items-start">
              <Check size={20} className="mr-3 text-green-600 mt-1 flex-shrink-0" />
              <p className="text-gray-600">Official Zero Drive uniform and merchandise</p>
            </div>
          </div>
          
          <Button 
            className="w-full bg-black text-white"
            onClick={() => setShowRegistrationForm(true)}
          >
            <FileText size={18} className="mr-2" />
            Submit Documents
          </Button>
        </div>
        
        <div className="mb-6">
          <h2 className="text-xl font-medium mb-4">Requirements</h2>
          
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium mb-2">Driver Requirements</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">•</span>
                  <span>Valid Pakistani driving license (at least 2 years old)</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">•</span>
                  <span>Minimum age of 21 years</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">•</span>
                  <span>Clear background check</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">•</span>
                  <span>Smartphone with Android 8.0+ or iOS 13+</span>
                </li>
              </ul>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium mb-2">Vehicle Requirements</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">•</span>
                  <span>Model year 2015 or newer</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">•</span>
                  <span>4-door vehicle in excellent condition</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">•</span>
                  <span>Valid registration and insurance</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">•</span>
                  <span>Pass vehicle inspection</span>
                </li>
              </ul>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium mb-2">Required Documents</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">•</span>
                  <span>CNIC (front and back)</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">•</span>
                  <span>Driving license (front and back)</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">•</span>
                  <span>Vehicle registration certificate</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">•</span>
                  <span>Vehicle photos (front, back, sides)</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">•</span>
                  <span>Selfie photo holding CNIC</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">•</span>
                  <span>Clear profile photo for your driver account</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex">
          <AlertCircle size={20} className="text-orange-500 mr-3 flex-shrink-0 mt-1" />
          <p className="text-sm text-orange-700">
            The application process takes approximately 3-5 business days. You'll need to visit our office for 
            documentation verification and vehicle inspection.
          </p>
        </div>
      </div>
      
      {showRegistrationForm && (
        <DriverRegistration 
          onClose={() => setShowRegistrationForm(false)}
          onSubmit={handleSubmitDocuments}
        />
      )}
      
      <BottomNavigation />
    </div>
  );
};

export default OfficialDriver;
