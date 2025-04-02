
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';

const ResetPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Check if we have a reset token in the URL
  React.useEffect(() => {
    const hash = location.hash;
    if (hash && hash.includes('type=recovery')) {
      const accessToken = new URLSearchParams(hash.substring(1)).get('access_token');
      if (accessToken) {
        setResetToken(accessToken);
        setIsResetMode(true);
      }
    }
  }, [location]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        throw error;
      }
      
      setResetSent(true);
      toast({
        title: "Reset Email Sent",
        description: "Please check your email for a password reset link.",
        duration: 5000
      });
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.message || "Unable to send reset email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated. You can now log in with your new password.",
        duration: 5000
      });
      
      navigate('/login');
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Unable to update password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col">
      <div className="mb-8">
        <button 
          onClick={() => navigate('/login')}
          className="flex items-center text-black mb-4"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Login
        </button>
        <h1 className="text-3xl font-bold">Reset Password</h1>
      </div>
      
      {isResetMode ? (
        <form onSubmit={handleUpdatePassword} className="flex-1 flex flex-col">
          <div className="mb-6">
            <label className="block text-gray-700 text-lg mb-2">New Password</label>
            <Input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              placeholder="••••••••" 
              className="w-full p-4 text-lg rounded-xl py-[30px]" 
              minLength={6}
            />
            <p className="mt-1 text-sm text-gray-500">Must be at least 6 characters</p>
          </div>
          
          <Button 
            type="submit" 
            disabled={isLoading || password.length < 6} 
            className="w-full bg-black text-white hover:bg-gray-800 text-xl rounded-xl py-[30px]"
          >
            {isLoading ? 'Updating Password...' : 'Update Password'}
          </Button>
        </form>
      ) : resetSent ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-24 h-24 mb-6 flex items-center justify-center rounded-full bg-green-100 text-green-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
          <p className="text-gray-600 text-center mb-8">
            We've sent a password reset link to <strong>{email}</strong>. Please check your inbox and spam folder.
          </p>
          <Button 
            onClick={() => navigate('/login')} 
            className="w-full bg-black text-white hover:bg-gray-800 text-xl rounded-xl py-[30px]"
          >
            Return to Login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleRequestReset} className="flex-1 flex flex-col">
          <div className="mb-6">
            <label className="block text-gray-700 text-lg mb-2">Email Address</label>
            <Input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              placeholder="your@email.com" 
              className="w-full p-4 text-lg rounded-xl py-[30px]" 
            />
            <p className="mt-1 text-sm text-gray-500">Enter the email address associated with your account</p>
          </div>
          
          <Button 
            type="submit" 
            disabled={isLoading || !email} 
            className="w-full bg-black text-white hover:bg-gray-800 text-xl rounded-xl py-[30px]"
          >
            {isLoading ? 'Sending Email...' : 'Send Reset Link'}
          </Button>
        </form>
      )}
    </div>
  );
};

export default ResetPassword;
