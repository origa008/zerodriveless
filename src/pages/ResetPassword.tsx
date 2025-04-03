
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const navigate = useNavigate();
  const { updateUserPassword, user } = useAuth();
  const { toast } = useToast();

  // Check if user is logged in
  useEffect(() => {
    const checkSession = async () => {
      // Get the hash parameters from the URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      // If there's no access_token in the URL and user is not logged in, redirect to login
      if (!hashParams.get('access_token') && !user?.isLoggedIn) {
        navigate('/login');
        toast({
          title: "Session expired",
          description: "Please login to reset your password",
          variant: "destructive"
        });
      }
    };
    
    checkSession();
  }, [navigate, user, toast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both password fields match.",
        variant: "destructive"
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      await updateUserPassword(newPassword);
      setShowSuccess(true);
    } catch (error) {
      console.error('Password reset error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col">
      <div className="mb-8">
        <button
          onClick={handleBackToLogin}
          className="flex items-center text-gray-600 mb-4"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Login
        </button>
        
        <h1 className="text-3xl font-bold">RESET PASSWORD</h1>
      </div>
      
      {showSuccess ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div className="bg-green-100 rounded-full p-6 mb-4">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-12 w-12 text-green-600 mx-auto" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Password Reset Successful</h2>
          <p className="text-gray-600 mb-6">
            Your password has been successfully updated. You can now login with your new password.
          </p>
          
          <Button
            onClick={handleBackToLogin}
            className="bg-black text-white hover:bg-gray-800 text-xl rounded-xl py-[30px] px-[38px]"
          >
            Back to Login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleResetPassword} className="flex-1 flex flex-col">
          <div className="mb-6">
            <p className="text-gray-600 mb-6">
              Please enter your new password below to reset your account password.
            </p>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-lg mb-2">New Password</label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"} 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  required 
                  placeholder="••••••••" 
                  className="w-full p-4 text-lg rounded-xl py-[30px] pr-12" 
                />
                <button 
                  type="button"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters long</p>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-lg mb-2">Confirm New Password</label>
              <Input 
                type={showPassword ? "text" : "password"} 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                required 
                placeholder="••••••••" 
                className="w-full p-4 text-lg rounded-xl py-[30px]" 
              />
            </div>
          </div>
          
          <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-black text-white hover:bg-gray-800 text-xl rounded-xl py-[30px]"
          >
            {isLoading ? 'Resetting Password...' : 'Reset Password'}
          </Button>
        </form>
      )}
    </div>
  );
};

export default ResetPassword;
