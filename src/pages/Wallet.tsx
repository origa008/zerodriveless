
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { CreditCard, ArrowLeft, Plus, Wallet as WalletIcon } from 'lucide-react';
import WithdrawForm, { WithdrawFormData } from '@/components/wallet/WithdrawForm';
import { useToast } from '@/hooks/use-toast';
import { useRide } from '@/lib/context/RideContext';

const Wallet: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { walletBalance, updateWalletBalance, rideHistory } = useRide();
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [showAddMoneyForm, setShowAddMoneyForm] = useState(false);
  const [addAmount, setAddAmount] = useState('');

  const handleWithdraw = (data: WithdrawFormData) => {
    if (Number(data.amount) > walletBalance) {
      toast({
        title: "Insufficient Balance",
        description: "You do not have enough funds to withdraw this amount.",
        duration: 5000
      });
      return;
    }

    updateWalletBalance(-Number(data.amount));
    setShowWithdrawForm(false);
    toast({
      title: "Withdrawal Request Submitted",
      description: `RS ${data.amount} will be transferred to your account within 24-48 hours.`,
      duration: 5000
    });
  };

  const handleAddMoney = () => {
    const amount = Number(addAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to add to your wallet.",
        duration: 3000
      });
      return;
    }

    updateWalletBalance(amount);
    setShowAddMoneyForm(false);
    setAddAmount('');
    toast({
      title: "Money Added Successfully",
      description: `RS ${amount} has been added to your wallet.`,
      duration: 3000
    });
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-black text-white p-6">
        <button onClick={() => navigate('/')} className="mb-4 flex items-center text-white">
          <ArrowLeft size={20} className="mr-2" />
          Back
        </button>
        
        <h1 className="text-3xl font-bold mb-6">Wallet</h1>
        
        <div className="bg-black text-white p-0 rounded-2xl mb-6 py-[34px] px-[0]">
          <p className="text-gray-300 mb-1">Available Balance</p>
          <h2 className="mb-4 text-5xl font-bold">RS {walletBalance.toFixed(0)}</h2>
          <div className="flex space-x-3">
            <Button className="bg-white text-black hover:bg-gray-100 flex-1" onClick={() => setShowAddMoneyForm(true)}>
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
          {rideHistory.length > 0 ? (
            rideHistory.map((ride, index) => {
              const isDriverEarning = ride.driver?.id === '1'; // If driver ID matches the user's ID
              const amount = isDriverEarning ? ride.price : -ride.price;
              const formattedDate = ride.endTime ? new Date(ride.endTime).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
              }) : 'Unknown date';

              return (
                <div key={ride.id || index} className="border-b border-gray-100 pb-4">
                  <div className="flex justify-between py-[15px]">
                    <div>
                      <h3 className="font-medium text-gray-500">
                        {isDriverEarning ? 'Drive To ' : 'Ride To '}{ride.dropoff.name}
                      </h3>
                      <p className="text-gray-500 text-sm">{formattedDate}</p>
                    </div>
                    <p className={`font-medium ${amount > 0 ? 'text-green-600' : ''}`}>
                      {amount > 0 ? '+' : ''}{ride.currency} {Math.abs(amount)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No transaction history yet.</p>
              <p className="text-sm text-gray-400 mt-2">Your ride and drive transactions will appear here.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Add Money Modal */}
      {showAddMoneyForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-medium mb-4">Add Money to Wallet</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Amount (RS)</label>
              <input
                type="number"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full border border-gray-300 rounded-lg p-3"
                min="1"
              />
            </div>
            
            <div className="mb-4">
              <p className="text-gray-700 font-medium mb-2">Payment Method</p>
              <div className="border border-gray-300 rounded-lg p-3 flex items-center mb-2">
                <div className="h-6 w-6 rounded-full bg-blue-500 mr-3 flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-white"></div>
                </div>
                <span>Debit/Credit Card</span>
              </div>
              <div className="border border-gray-300 rounded-lg p-3 flex items-center opacity-50">
                <div className="h-6 w-6 rounded-full border border-gray-300 mr-3"></div>
                <span>Bank Transfer (Coming Soon)</span>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowAddMoneyForm(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-black text-white"
                onClick={handleAddMoney}
                disabled={!addAmount || Number(addAmount) <= 0}
              >
                Add Money
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {showWithdrawForm && <WithdrawForm onClose={() => setShowWithdrawForm(false)} onSubmit={handleWithdraw} />}
      
      <BottomNavigation />
    </div>
  );
};

export default Wallet;
