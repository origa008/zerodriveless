
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { requestWithdrawal } from '@/lib/utils/walletUtils';

interface WithdrawFormProps {
  onClose: () => void;
  onSuccess: () => void;
  currentBalance: number;
}

export interface WithdrawFormData {
  amount: number;
  bankName: string;
  accountNumber: string;
  accountTitle: string;
  phone: string;
}

const banks = [
  'HBL',
  'MCB',
  'UBL',
  'Allied Bank',
  'Bank Alfalah',
  'Meezan Bank',
  'Easypaisa',
  'JazzCash'
];

const WithdrawForm: React.FC<WithdrawFormProps> = ({ onClose, onSuccess, currentBalance }) => {
  const [formData, setFormData] = useState<WithdrawFormData>({
    amount: 0,
    bankName: '',
    accountNumber: '',
    accountTitle: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'amount' ? Number(value) : value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to withdraw funds",
        variant: "destructive"
      });
      return;
    }
    
    if (formData.amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }
    
    if (formData.amount > currentBalance) {
      toast({
        title: "Insufficient funds",
        description: "Your withdrawal amount exceeds your available balance",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { success, error } = await requestWithdrawal(
        user.id,
        formData.amount,
        {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          accountTitle: formData.accountTitle,
          phone: formData.phone
        }
      );
      
      if (!success) {
        throw new Error(error || "Failed to process withdrawal");
      }
      
      toast({
        title: "Withdrawal requested",
        description: "Your withdrawal request has been submitted and is being processed",
      });
      
      onSuccess();
    } catch (error: any) {
      console.error("Withdrawal request error:", error);
      toast({
        title: "Withdrawal failed",
        description: error.message || "Failed to process withdrawal request",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1F2C] text-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-medium">Withdraw Funds</h3>
          <button onClick={onClose}>
            <X size={24} className="text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Amount (RS)</label>
              <input
                type="number"
                name="amount"
                min="100"
                required
                value={formData.amount}
                onChange={handleChange}
                className="w-full border border-gray-700 bg-[#2A2F3C] text-white rounded-lg p-3"
                placeholder="1000"
              />
              <p className="text-sm text-gray-400 mt-1">Minimum withdrawal: RS 100</p>
              <p className="text-sm text-gray-400">Available balance: RS {currentBalance}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Bank / Wallet</label>
              <select
                name="bankName"
                required
                value={formData.bankName}
                onChange={handleChange}
                className="w-full border border-gray-700 bg-[#2A2F3C] text-white rounded-lg p-3"
              >
                <option value="">Select Bank or Wallet</option>
                {banks.map(bank => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Account Number</label>
              <input
                type="text"
                name="accountNumber"
                required
                value={formData.accountNumber}
                onChange={handleChange}
                className="w-full border border-gray-700 bg-[#2A2F3C] text-white rounded-lg p-3"
                placeholder="Account or IBAN number"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Account Title</label>
              <input
                type="text"
                name="accountTitle"
                required
                value={formData.accountTitle}
                onChange={handleChange}
                className="w-full border border-gray-700 bg-[#2A2F3C] text-white rounded-lg p-3"
                placeholder="Your account name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full border border-gray-700 bg-[#2A2F3C] text-white rounded-lg p-3"
                placeholder="+92 300 1234567"
              />
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              type="button"
              variant="outline" 
              className="flex-1 border-white/20 text-white hover:bg-white/10"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Withdraw'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WithdrawForm;
