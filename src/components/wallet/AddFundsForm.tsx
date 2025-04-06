
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Info, Upload, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type PaymentMethod = 'bank_transfer' | 'mobile_wallet';

interface BankTransferDetails {
  accountTitle: string;
  accountNumber: string;
  bankName: string;
  screenshot: File | null;
  transactionReference: string;
  amount: number;
}

const AddFundsForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bankDetails, setBankDetails] = useState<BankTransferDetails>({
    accountTitle: '',
    accountNumber: '',
    bankName: '',
    screenshot: null,
    transactionReference: '',
    amount: 0
  });
  const [screenshotName, setScreenshotName] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBankDetails(prev => ({ ...prev, screenshot: file }));
      setScreenshotName(file.name);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'amount') {
      const amount = parseInt(value, 10) || 0;
      setBankDetails(prev => ({ ...prev, [name]: amount }));
    } else {
      setBankDetails(prev => ({ ...prev, [name]: value }));
    }
  };

  const uploadTransactionScreenshot = async (userId: string, file: File): Promise<string | null> => {
    try {
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const filename = `${userId}_deposit_${timestamp}.${fileExtension}`;
      
      const { data, error } = await supabase
        .storage
        .from('transaction_receipts')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) throw error;
      
      const { data: urlData } = supabase
        .storage
        .from('transaction_receipts')
        .getPublicUrl(filename);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error("Screenshot upload error:", error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to add funds",
        duration: 3000
      });
      return;
    }
    
    if (bankDetails.amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        duration: 3000
      });
      return;
    }
    
    if (!bankDetails.accountTitle || !bankDetails.accountNumber || !bankDetails.bankName) {
      toast({
        title: "Missing details",
        description: "Please fill in all required fields",
        duration: 3000
      });
      return;
    }
    
    if (!bankDetails.screenshot) {
      toast({
        title: "Screenshot required",
        description: "Please upload a screenshot of your transfer",
        duration: 3000
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Upload screenshot
      const screenshotUrl = await uploadTransactionScreenshot(user.id, bankDetails.screenshot);
      
      if (!screenshotUrl) {
        throw new Error("Failed to upload screenshot");
      }
      
      // Create deposit request using the raw query method instead of the typed method
      // This is a workaround for the type issue since deposit_requests isn't in the types
      const { error } = await supabase
        .from('deposit_requests')
        .insert({
          user_id: user.id,
          amount: bankDetails.amount,
          bank_name: bankDetails.bankName,
          account_title: bankDetails.accountTitle,
          account_number: bankDetails.accountNumber,
          receipt_url: screenshotUrl,
          transaction_reference: bankDetails.transactionReference,
          status: 'pending'
        } as any); // Use 'as any' to bypass type checking for this insert
      
      if (error) throw error;
      
      toast({
        title: "Deposit request submitted",
        description: "Your deposit request has been submitted and is pending approval",
        duration: 5000
      });
      
      onSuccess();
    } catch (error: any) {
      console.error("Deposit request error:", error);
      toast({
        title: "Deposit failed",
        description: error.message || "Failed to submit deposit request",
        duration: 5000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg">
      <div className="mb-4">
        <h2 className="text-lg font-medium">Add Funds to Wallet</h2>
        <p className="text-sm text-gray-500">Select your preferred payment method</p>
      </div>
      
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-start">
          <Info className="text-blue-500 mr-2 mt-0.5" size={18} />
          <div>
            <p className="text-sm text-blue-700 font-medium">Bank Transfer Instructions</p>
            <p className="text-xs text-blue-600 mt-1">
              Transfer the funds to our UBL account and upload the screenshot below.
            </p>
            <div className="mt-2 bg-white p-2 rounded border border-blue-100">
              <p className="text-xs font-medium">Bank: United Bank Limited (UBL)</p>
              <p className="text-xs font-medium">Account: 1234-5678-9012-3456</p>
              <p className="text-xs font-medium">Title: ZeroDrive Technologies</p>
            </div>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        {paymentMethod === 'bank_transfer' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Amount (RS) *</label>
              <input
                type="number"
                name="amount"
                min={100}
                value={bankDetails.amount || ''}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg p-3"
                placeholder="Enter amount"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Bank Name *</label>
              <select
                name="bankName"
                value={bankDetails.bankName}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg p-3"
                required
              >
                <option value="">Select Bank</option>
                <option value="UBL">United Bank Limited (UBL)</option>
                <option value="HBL">Habib Bank Limited (HBL)</option>
                <option value="MCB">MCB Bank Limited</option>
                <option value="Meezan">Meezan Bank</option>
                <option value="Standard Chartered">Standard Chartered</option>
                <option value="Bank Alfalah">Bank Alfalah</option>
                <option value="Allied Bank">Allied Bank</option>
                <option value="Faysal Bank">Faysal Bank</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Account Title *</label>
              <input
                type="text"
                name="accountTitle"
                value={bankDetails.accountTitle}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg p-3"
                placeholder="Enter account title"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Account Number *</label>
              <input
                type="text"
                name="accountNumber"
                value={bankDetails.accountNumber}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg p-3"
                placeholder="Enter account number"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Transaction Reference</label>
              <input
                type="text"
                name="transactionReference"
                value={bankDetails.transactionReference}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg p-3"
                placeholder="Enter transaction reference (optional)"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Upload Receipt Screenshot *</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="file"
                  id="screenshot"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                  required
                />
                <label
                  htmlFor="screenshot"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  {bankDetails.screenshot ? (
                    <div className="text-center">
                      <div className="bg-green-100 h-10 w-10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Check className="text-green-500" size={20} />
                      </div>
                      <p className="text-green-600 font-medium">{screenshotName}</p>
                      <p className="text-sm text-gray-500 mt-1">Click to replace</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-gray-400 mb-2" />
                      <p className="text-gray-500 text-sm">Click to upload screenshot</p>
                      <p className="text-gray-400 text-xs mt-1">JPG, PNG or WEBP</p>
                    </>
                  )}
                </label>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-zerodrive-purple hover:bg-violet-800" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Submit Deposit Request'
              )}
            </Button>
          </>
        )}
      </form>
    </div>
  );
};

export default AddFundsForm;
