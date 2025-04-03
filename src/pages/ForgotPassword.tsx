
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { resetPassword } from '@/lib/utils/supabaseUtils';
import { useToast } from '@/hooks/use-toast';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
        duration: 3000
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await resetPassword(email);
      
      if (result) {
        setEmailSent(true);
        toast({
          title: "Reset email sent",
          description: "Please check your email for password reset instructions",
          duration: 5000
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send reset email. Please try again.",
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

  return (
    <div className="min-h-screen bg-white p-6">
      <button 
        onClick={() => navigate('/login')}
        className="mb-8 flex items-center text-gray-600"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Login
      </button>

      <div className="max-w-md mx-auto mt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
          <p className="text-gray-600">Enter your email to receive a password reset link</p>
        </div>

        {emailSent ? (
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h2 className="text-xl font-medium text-green-800 mb-2">Email Sent!</h2>
            <p className="mb-4">We've sent password reset instructions to <strong>{email}</strong>.</p>
            <p className="mb-4">Please check your email and follow the instructions to reset your password.</p>
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full mt-4"
            >
              Return to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-black hover:bg-gray-800 text-white py-6 text-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Remember your password?{' '}
            <Link to="/login" className="text-black font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
