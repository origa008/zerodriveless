
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updatePassword } from '@/lib/utils/supabaseUtils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have a valid recovery token in the URL
    const checkHash = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        toast({
          title: "Invalid or expired recovery link",
          description: "Please request a new password reset link",
          variant: "destructive",
          duration: 5000
        });
        navigate('/forgot-password');
      } else {
        setIsValid(true);
      }
    };

    checkHash();
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
        duration: 3000
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords match",
        variant: "destructive",
        duration: 3000
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await updatePassword(password);
      
      if (result) {
        toast({
          title: "Password updated",
          description: "Your password has been successfully updated",
          duration: 5000
        });
        navigate('/login');
      } else {
        toast({
          title: "Error",
          description: "Failed to update password. Please try again.",
          variant: "destructive",
          duration: 3000
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating your reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-md mx-auto mt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Set New Password</h1>
          <p className="text-gray-600">Create a new secure password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500">Must be at least 6 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-black hover:bg-gray-800 text-white py-6 text-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
