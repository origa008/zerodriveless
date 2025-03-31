
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BottomNavigation from '@/components/layout/BottomNavigation';

const Policies: React.FC = () => {
  const navigate = useNavigate();

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
        
        <h1 className="text-2xl font-bold">Policies</h1>
        <p className="text-gray-300">Terms of service & privacy policies</p>
      </div>
      
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-xl font-medium mb-4">Terms of Service</h2>
          <p className="text-gray-600 mb-3">
            By using Zero Drive, you agree to these terms which govern your use of our services.
          </p>
          <div className="space-y-4 text-gray-600 text-sm">
            <p>
              <strong>1. Service Description:</strong> Zero Drive provides a platform connecting drivers and passengers for transportation services in Pakistan.
            </p>
            <p>
              <strong>2. User Accounts:</strong> Users must register with accurate information and maintain account security.
            </p>
            <p>
              <strong>3. Payments:</strong> Passengers agree to pay for rides, and drivers agree to provide the service for the agreed fare.
            </p>
            <p>
              <strong>4. Conduct:</strong> Users must follow local laws and regulations, and treat others with respect.
            </p>
            <p>
              <strong>5. Termination:</strong> Zero Drive reserves the right to terminate accounts for violations of these terms.
            </p>
          </div>
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-medium mb-4">Privacy Policy</h2>
          <p className="text-gray-600 mb-3">
            This policy explains how we collect, use, and protect your personal information.
          </p>
          <div className="space-y-4 text-gray-600 text-sm">
            <p>
              <strong>1. Information Collection:</strong> We collect personal information including name, contact details, payment information, and location data.
            </p>
            <p>
              <strong>2. Use of Information:</strong> We use your information to provide our services, process payments, and improve our platform.
            </p>
            <p>
              <strong>3. Data Security:</strong> We implement appropriate security measures to protect your personal information.
            </p>
            <p>
              <strong>4. Third-Party Sharing:</strong> We may share information with service providers, payment processors, and as required by law.
            </p>
            <p>
              <strong>5. Your Rights:</strong> You have the right to access, correct, or delete your personal information.
            </p>
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-medium mb-4">Cancellation Policy</h2>
          <div className="space-y-4 text-gray-600 text-sm">
            <p>
              <strong>1. Passenger Cancellations:</strong> Passengers may cancel a ride request at any time before the driver arrives. Cancellation fees may apply.
            </p>
            <p>
              <strong>2. Driver Cancellations:</strong> Drivers should only cancel rides in exceptional circumstances. Excessive cancellations may lead to account review.
            </p>
            <p>
              <strong>3. Refunds:</strong> Refunds for canceled rides will be processed according to our refund policy.
            </p>
          </div>
        </div>
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default Policies;
