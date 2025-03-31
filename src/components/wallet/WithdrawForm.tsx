
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface WithdrawFormProps {
  onClose: () => void;
  onSubmit: (data: WithdrawFormData) => void;
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

const WithdrawForm: React.FC<WithdrawFormProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState<WithdrawFormData>({
    amount: 0,
    bankName: '',
    accountNumber: '',
    accountTitle: '',
    phone: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'amount' ? Number(value) : value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-medium">Withdraw Funds</h3>
          <button onClick={onClose}>
            <X size={24} />
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
                className="w-full border border-gray-300 rounded-lg p-3"
                placeholder="1000"
              />
              <p className="text-sm text-gray-500 mt-1">Minimum withdrawal: RS 100</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Bank / Wallet</label>
              <select
                name="bankName"
                required
                value={formData.bankName}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-3"
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
                className="w-full border border-gray-300 rounded-lg p-3"
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
                className="w-full border border-gray-300 rounded-lg p-3"
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
                className="w-full border border-gray-300 rounded-lg p-3"
                placeholder="+92 300 1234567"
              />
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              type="button"
              variant="outline" 
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="flex-1 bg-black text-white"
            >
              Withdraw
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WithdrawForm;
