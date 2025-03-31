
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { CreditCard, ArrowLeft, Plus, Wallet as WalletIcon, Gift, ArrowDown, ArrowUp } from 'lucide-react';
import WithdrawForm, { WithdrawFormData } from '@/components/wallet/WithdrawForm';
import { useToast } from '@/hooks/use-toast';
import { useRide } from '@/lib/context/RideContext';
import { useAuth } from '@/lib/context/AuthContext';

const Wallet: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { walletBalance, updateWalletBalance, rideHistory } = useRide();
  const { referralEarnings } = useAuth();
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [showAddMoneyForm, setShowAddMoneyForm] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  
  const [activeTab, setActiveTab] = useState<'all' | 'rides' | 'referrals'>('all');

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

  const filteredTransactions = () => {
    switch (activeTab) {
      case 'rides':
        return rideHistory;
      case 'referrals':
        // In a real app, we'd have actual referral transactions
        return [];
      default:
        return rideHistory; // All transactions
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 pt-10 rounded-b-3xl">
        <button onClick={() => navigate('/')} className="mb-4 flex items-center text-white">
          <ArrowLeft size={20} className="mr-2" />
          Back
        </button>
        
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-2xl font-bold">Wallet</h1>
          <WalletIcon size={28} className="text-white/70" />
        </div>
        
        <div className="bg-white/10 rounded-2xl p-6 mb-6">
          <p className="text-white/80 mb-1">Available Balance</p>
          <h2 className="mb-2 text-4xl font-bold">RS {walletBalance.toFixed(0)}</h2>
          
          {referralEarnings > 0 && (
            <div className="mb-4 bg-white/10 rounded-lg p-2 inline-block">
              <div className="flex items-center">
                <Gift size={16} className="mr-1 text-white/70" />
                <span className="text-sm">Referral earnings: RS {referralEarnings}</span>
              </div>
            </div>
          )}
          
          <div className="flex space-x-3 mt-4">
            <Button className="bg-white text-purple-600 hover:bg-white/90 flex-1" onClick={() => setShowAddMoneyForm(true)}>
              <Plus size={18} className="mr-2" />
              Add Money
            </Button>
            <Button variant="outline" onClick={() => setShowWithdrawForm(true)} className="border-white text-white hover:bg-white/10 flex-1">
              <ArrowDown size={18} className="mr-2" />
              Withdraw
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex rounded-lg bg-gray-100 p-1 mb-4">
          <button 
            className={`flex-1 py-2 rounded-md text-sm font-medium ${activeTab === 'all' ? 'bg-white shadow' : 'text-gray-500'}`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button 
            className={`flex-1 py-2 rounded-md text-sm font-medium ${activeTab === 'rides' ? 'bg-white shadow' : 'text-gray-500'}`}
            onClick={() => setActiveTab('rides')}
          >
            Rides
          </button>
          <button 
            className={`flex-1 py-2 rounded-md text-sm font-medium ${activeTab === 'referrals' ? 'bg-white shadow' : 'text-gray-500'}`}
            onClick={() => setActiveTab('referrals')}
          >
            Referrals
          </button>
        </div>
        
        <h2 className="mb-4 text-xl font-bold">Transaction History</h2>
        
        <div className="space-y-4 bg-transparent my-[20px]">
          {filteredTransactions().length > 0 ? (
            filteredTransactions().map((ride, index) => {
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
                <div key={ride.id || index} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${amount > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                        {amount > 0 ? (
                          <ArrowDown size={16} className="text-green-600" />
                        ) : (
                          <ArrowUp size={16} className="text-red-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium">
                          {isDriverEarning ? 'Drive To ' : 'Ride To '}{ride.dropoff.name}
                        </h3>
                        <p className="text-gray-500 text-sm">{formattedDate}</p>
                      </div>
                    </div>
                    <p className={`font-medium ${amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {amount > 0 ? '+' : ''}{ride.currency} {Math.abs(amount)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <p className="text-gray-500">No transaction history yet.</p>
              <p className="text-sm text-gray-400 mt-2">Your transactions will appear here.</p>
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
