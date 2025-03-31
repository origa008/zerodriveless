import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { CreditCard, ArrowLeft, Plus, Wallet as WalletIcon } from 'lucide-react';
import WithdrawForm, { WithdrawFormData } from '@/components/wallet/WithdrawForm';
import { useToast } from '@/hooks/use-toast';
const Wallet: React.FC = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const handleWithdraw = (data: WithdrawFormData) => {
    console.log('Withdraw request:', data);
    setShowWithdrawForm(false);
    toast({
      title: "Withdrawal Request Submitted",
      description: `RS ${data.amount} will be transferred to your account within 24-48 hours.`,
      duration: 5000
    });
  };
  return <div className="min-h-screen bg-white pb-20">
      <div className="bg-black text-white p-6">
        <button onClick={() => navigate('/')} className="mb-4 flex items-center text-white">
          <ArrowLeft size={20} className="mr-2" />
          Back
        </button>
        
        <h1 className="text-3xl font-bold mb-6">Wallet</h1>
        
        <div className="bg-black text-white p-0 rounded-2xl mb-6 py-[34px] px-[0]">
          <p className="text-gray-300 mb-1">Available Balance</p>
          <h2 className="mb-4 text-5xl font-bold">RS 1,250</h2>
          <div className="flex space-x-3">
            <Button className="bg-white text-black hover:bg-gray-100 flex-1">
              <Plus size={18} className="mr-2" />
              Add Money
            </Button>
            <Button variant="outline" onClick={() => setShowWithdrawForm(true)} className="border-white flex-1 text-black bg-white">
              <WalletIcon size={18} className="mr-2" />
              Withdraw
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <h2 className="mb-4 text-4xl font-normal">Spendings</h2>
        
        <div className="space-y-4 bg-transparent my-[20px]">
          <div className="border-b border-gray-100 pb-4">
            <div className="flex justify-between py-[15px]">
              <div>
                <h3 className="font-medium text-gray-500">Ride To Bahria Town</h3>
                <p className="text-gray-500 text-sm">Today, 2:30 PM</p>
              </div>
              <p className="font-medium">-RS 120</p>
            </div>
          </div>
          
          <div className="border-b border-gray-100 pb-4">
            <div className="flex justify-between my-[15px]">
              <div>
                <h3 className="font-medium text-base text-gray-500">Drive To Johar Town</h3>
                <p className="text-gray-500 text-sm">Yesterday, 5:45 PM</p>
              </div>
              <p className="font-medium text-green-600">+RS 500</p>
            </div>
          </div>
          
          <div className="border-b border-gray-100 pb-4">
            <div className="flex justify-between my-[15px]">
              <div>
                <h3 className="font-medium text-gray-500">Ride to Dolmen Mall</h3>
                <p className="text-gray-500 text-sm">May 15, 10:20 AM</p>
              </div>
              <p className="font-medium">-RS 85</p>
            </div>
          </div>
          
          <div className="border-b border-gray-100 pb-4">
            <div className="flex justify-between my-[15px]">
              <div>
                <h3 className="font-medium text-gray-500">Drive to Liberty Market</h3>
                <p className="text-gray-500 text-sm">May 14, 3:15 PM</p>
              </div>
              <p className="font-medium text-green-600">+RS 320</p>
            </div>
          </div>
        </div>
      </div>
      
      {showWithdrawForm && <WithdrawForm onClose={() => setShowWithdrawForm(false)} onSubmit={handleWithdraw} />}
      
      <BottomNavigation />
    </div>;
};
export default Wallet;