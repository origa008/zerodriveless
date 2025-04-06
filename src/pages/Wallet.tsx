
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { CreditCard, ArrowLeft, Plus, Wallet as WalletIcon, Gift, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import WithdrawForm, { WithdrawFormData } from '@/components/wallet/WithdrawForm';
import { useToast } from '@/hooks/use-toast';
import { useRide } from '@/lib/context/RideContext';
import { useAuth } from '@/lib/context/AuthContext';
import { addFundsToWallet, requestWithdrawal, getTransactionHistory } from '@/lib/utils/walletUtils';
import { format } from 'date-fns';

const Wallet: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { walletBalance, updateWalletBalance } = useRide();
  const { user } = useAuth();
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [showAddMoneyForm, setShowAddMoneyForm] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Referral earnings (will be updated from transactions)
  const [referralEarnings, setReferralEarnings] = useState(0);

  // Fetch transaction history when component mounts
  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      getTransactionHistory(user.id)
        .then(({ transactions, error }) => {
          if (!error && transactions) {
            setTransactions(transactions);
            
            // Calculate referral earnings
            const referralTotal = transactions
              .filter(tx => tx.type === 'referral')
              .reduce((sum, tx) => sum + Number(tx.amount), 0);
            
            setReferralEarnings(referralTotal);
          } else {
            console.error("Error fetching transactions:", error);
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [user?.id]);

  const handleWithdraw = async (data: WithdrawFormData) => {
    if (Number(data.amount) > walletBalance) {
      toast({
        title: "Insufficient Balance",
        description: "You do not have enough funds to withdraw this amount.",
        duration: 5000
      });
      return;
    }
    
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to withdraw funds.",
        duration: 5000
      });
      return;
    }

    const bankDetails = {
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      accountTitle: data.accountTitle,
      phone: data.phone || '',
    };

    const { success, error } = await requestWithdrawal(
      user.id,
      Number(data.amount),
      bankDetails
    );

    if (success) {
      updateWalletBalance(-Number(data.amount));
      setShowWithdrawForm(false);
      
      // Update transactions list
      getTransactionHistory(user.id).then(({ transactions }) => {
        if (transactions) {
          setTransactions(transactions);
        }
      });
      
      toast({
        title: "Withdrawal Request Submitted",
        description: `RS ${data.amount} will be transferred to your account within 24-48 hours.`,
        duration: 5000
      });
    } else {
      toast({
        title: "Withdrawal Failed",
        description: error || "An error occurred while processing your withdrawal.",
        duration: 5000
      });
    }
  };

  const handleAddMoney = async () => {
    const amount = Number(addAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to add to your wallet.",
        duration: 3000
      });
      return;
    }
    
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to add funds.",
        duration: 3000
      });
      return;
    }

    const { success, error } = await addFundsToWallet(
      user.id,
      amount,
      'credit_card'
    );

    if (success) {
      updateWalletBalance(amount);
      setShowAddMoneyForm(false);
      setAddAmount('');
      
      // Update transactions list
      getTransactionHistory(user.id).then(({ transactions }) => {
        if (transactions) {
          setTransactions(transactions);
        }
      });
      
      toast({
        title: "Money Added Successfully",
        description: `RS ${amount} has been added to your wallet.`,
        duration: 3000
      });
    } else {
      toast({
        title: "Transaction Failed",
        description: error || "An error occurred while processing your payment.",
        duration: 3000
      });
    }
  };

  const formatTransactionDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, h:mm a');
    } catch (e) {
      return 'Unknown date';
    }
  };

  const renderTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) {
      return <ArrowDownRight className="text-green-600" size={18} />;
    } else {
      return <ArrowUpRight className="text-red-600" size={18} />;
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-gradient-to-r from-black to-gray-800 text-white p-6 pb-12">
        <button onClick={() => navigate('/')} className="mb-4 flex items-center text-white">
          <ArrowLeft size={20} className="mr-2" />
          Back
        </button>
        
        <h1 className="text-3xl font-bold mb-8">Wallet</h1>
        
        <div className="bg-white text-black p-8 rounded-2xl shadow-lg relative">
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full text-sm font-medium">
            Available Balance
          </div>
          <h2 className="mt-4 mb-4 text-5xl font-bold text-center">RS {walletBalance.toFixed(0)}</h2>
          <div className="flex space-x-3">
            <Button className="bg-black text-white hover:bg-gray-800 flex-1 py-6" onClick={() => setShowAddMoneyForm(true)}>
              <Plus size={18} className="mr-2" />
              Add Money
            </Button>
            <Button variant="outline" onClick={() => setShowWithdrawForm(true)} className="border-gray-300 flex-1 py-6">
              <WalletIcon size={18} className="mr-2" />
              Withdraw
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-6 -mt-6">
        {referralEarnings > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="bg-green-100 p-2 rounded-full mr-3">
                <Gift className="text-green-600" size={20} />
              </div>
              <div>
                <p className="font-medium">Referral Earnings</p>
                <p className="text-green-600 font-medium">RS {referralEarnings}</p>
              </div>
            </div>
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => navigate('/community')}
              className="text-green-600"
            >
              Invite More
            </Button>
          </div>
        )}
        
        <h2 className="mb-4 text-2xl font-bold">Transaction History</h2>
        
        <div className="space-y-4 bg-transparent my-[20px]">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <p className="text-gray-500">Loading transactions...</p>
            </div>
          ) : transactions.length > 0 ? (
            transactions.map((tx) => (
              <div key={tx.id} className="border-b border-gray-100 pb-4">
                <div className="flex justify-between py-[15px]">
                  <div className="flex items-center">
                    <div className={`mr-3 p-2 rounded-full ${tx.amount > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                      {renderTransactionIcon(tx.type, tx.amount)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">
                        {tx.type === 'deposit' ? 'Added to Wallet' : 
                         tx.type === 'withdrawal' ? 'Withdrawal' : 
                         tx.type === 'ride_payment' ? 'Ride Payment' :
                         tx.type === 'ride_earning' ? 'Ride Earning' :
                         tx.type === 'referral' ? 'Referral Bonus' : 
                         'Transaction'}
                      </h3>
                      <p className="text-gray-500 text-sm">{formatTransactionDate(tx.created_at)}</p>
                      {tx.description && <p className="text-gray-500 text-xs mt-1">{tx.description}</p>}
                    </div>
                  </div>
                  <p className={`font-medium ${tx.amount > 0 ? 'text-green-600' : ''}`}>
                    {tx.amount > 0 ? '+' : ''} RS {Math.abs(tx.amount)}
                  </p>
                </div>
              </div>
            ))
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
