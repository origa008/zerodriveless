
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BottomNavigation from '@/components/layout/BottomNavigation';
import DriverRegistration from '@/components/driver/DriverRegistration';
import { useToast } from '@/hooks/use-toast';
import { DriverDocument } from '@/lib/types';
import { useAuth } from '@/lib/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useRide } from '@/lib/context/RideContext';

const OfficialDriver: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, session } = useAuth();
  const { walletBalance, updateWalletBalance } = useRide();
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [driverDetails, setDriverDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  
  // Fetch driver details if available
  useEffect(() => {
    const fetchDriverDetails = async () => {
      if (!session?.user?.id) return;
      
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('driver_details')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (error) {
          throw error;
        }
        
        setDriverDetails(data);
      } catch (error) {
        console.error('Error fetching driver details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDriverDetails();
  }, [session?.user?.id]);
  
  const handleSubmitDocuments = async (data: DriverDocument) => {
    console.log('Driver registration data:', data);
    setShowRegistrationForm(false);
    
    // Refresh driver details
    if (session?.user?.id) {
      try {
        const { data: updatedData, error } = await supabase
          .from('driver_details')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (error) {
          throw error;
        }
        
        setDriverDetails(updatedData);
      } catch (error) {
        console.error('Error refreshing driver details:', error);
      }
    }
  };
  
  const makeDeposit = async () => {
    if (!session?.user?.id || !driverDetails) return;
    
    // Check if user has enough balance
    if (walletBalance < 3000) {
      toast({
        title: "Insufficient balance",
        description: "Please add more funds to your wallet before making a deposit.",
        variant: "destructive"
      });
      navigate('/wallet');
      return;
    }
    
    // Make deposit by marking driver as having sufficient deposit
    try {
      const { error } = await supabase
        .from('driver_details')
        .update({
          status: 'pending_approval',
          has_sufficient_deposit: true
        })
        .eq('id', driverDetails.id);
      
      if (error) {
        throw error;
      }
      
      // Refresh driver details
      const { data: updatedData, error: refreshError } = await supabase
        .from('driver_details')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();
      
      if (refreshError) {
        throw refreshError;
      }
      
      setDriverDetails(updatedData);
      setShowDepositModal(false);
      
      toast({
        title: "Deposit successful",
        description: "Your driver deposit has been made. Your application is now pending final approval.",
        duration: 5000
      });
    } catch (error: any) {
      console.error('Error making deposit:', error);
      toast({
        title: "Deposit failed",
        description: error.message || "Failed to make deposit. Please try again.",
        variant: "destructive"
      });
    }
  };

  const renderApplicationStatus = () => {
    if (!driverDetails) return null;
    
    switch (driverDetails.status) {
      case 'pending':
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-medium text-blue-800 mb-2">Application in Review</h2>
            <p className="text-blue-700 mb-4">
              Your application has been submitted and is currently under review.
            </p>
            {!driverDetails.has_sufficient_deposit && (
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setShowDepositModal(true)}
              >
                Make Driver Deposit (RS 3,000)
              </Button>
            )}
          </div>
        );
      
      case 'pending_approval':
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-medium text-blue-800 mb-2">Application in Final Review</h2>
            <p className="text-blue-700">
              Your application and deposit have been received. We are conducting the final verification.
              You will be notified once your driver account is approved.
            </p>
          </div>
        );
      
      case 'approved':
        return (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-medium text-green-800 mb-2">You're an Official Driver!</h2>
            <p className="text-green-700 mb-4">
              Congratulations! Your application has been approved. You can now switch to driver mode
              and start accepting ride requests.
            </p>
            <Button 
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={() => navigate('/')}
            >
              Start Driving
            </Button>
          </div>
        );
      
      case 'rejected':
        return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-medium text-red-800 mb-2">Application Rejected</h2>
            <p className="text-red-700 mb-4">
              Unfortunately, your application has been rejected. This may be due to incomplete or
              invalid documentation. Please contact support for more information.
            </p>
            <Button 
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setShowRegistrationForm(true)}
            >
              Reapply
            </Button>
          </div>
        );
      
      default:
        return null;
    }
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
        {/* Show application status if user has already applied */}
        {!isLoading && renderApplicationStatus()}
        
        {!isLoading && !driverDetails && (
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
        )}
        
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
            <strong>Important:</strong> A security deposit of RS 3,000 is required to become an official driver.
            This deposit will be held in your wallet and can be withdrawn when you stop being a driver.
            The application process takes 3-5 business days after all requirements are met.
          </p>
        </div>
      </div>
      
      {showRegistrationForm && (
        <DriverRegistration 
          onClose={() => setShowRegistrationForm(false)}
          onSubmit={handleSubmitDocuments}
        />
      )}
      
      {/* Driver Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-medium mb-2">Driver Security Deposit</h3>
            <p className="text-gray-600 mb-4">
              A security deposit of RS 3,000 is required to complete your driver application.
              This amount will be held in your wallet as long as you remain an active driver.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-gray-700 mb-1">Current wallet balance:</p>
              <p className="text-2xl font-bold">{walletBalance.toFixed(0)} RS</p>
              
              {walletBalance < 3000 && (
                <p className="text-red-600 text-sm mt-2">
                  Insufficient balance. You need to add at least {(3000 - walletBalance).toFixed(0)} RS more.
                </p>
              )}
            </div>
            
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowDepositModal(false)}
              >
                Cancel
              </Button>
              
              {walletBalance < 3000 ? (
                <Button 
                  className="flex-1 bg-black text-white"
                  onClick={() => {
                    setShowDepositModal(false);
                    navigate('/wallet');
                  }}
                >
                  Add Funds
                </Button>
              ) : (
                <Button 
                  className="flex-1 bg-black text-white"
                  onClick={makeDeposit}
                >
                  Make Deposit
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      
      <BottomNavigation />
    </div>
  );
};

export default OfficialDriver;
