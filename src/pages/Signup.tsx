
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Trim inputs and validate
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();
      const trimmedReferralCode = referralCode.trim();
      
      if (!trimmedName || !trimmedEmail || !password) {
        throw new Error('Please fill out all required fields');
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        throw new Error('Please enter a valid email address');
      }
      
      // Validate password length
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      // Call signup function with optional referral code
      await signup(
        trimmedName, 
        trimmedEmail, 
        password, 
        trimmedReferralCode || undefined
      );
      
      // Navigate to home page on success
      navigate('/');
      
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message || "Please check your information and try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">CREATE ACCOUNT</h1>
      </div>
      
      <form onSubmit={handleSignup} className="flex-1 flex flex-col">
        <div className="mb-6">
          <label className="block text-gray-700 text-lg mb-2">Full Name</label>
          <Input 
            type="text" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
            placeholder="John Smith" 
            className="w-full p-4 text-lg rounded-xl py-[30px]" 
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-lg mb-2">Email</label>
          <Input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
            placeholder="your@email.com" 
            className="w-full p-4 text-lg rounded-xl py-[30px]" 
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-lg mb-2">Password</label>
          <Input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
            placeholder="••••••••" 
            className="w-full p-4 text-lg rounded-xl py-[30px]" 
          />
          <p className="mt-1 text-sm text-gray-500">Must be at least 6 characters</p>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-lg mb-2">Referral Code (Optional)</label>
          <Input 
            type="text" 
            value={referralCode} 
            onChange={e => setReferralCode(e.target.value)} 
            placeholder="Enter referral code" 
            className="w-full p-4 text-lg rounded-xl py-[30px]" 
          />
        </div>
        
        <Button 
          type="submit" 
          disabled={isLoading} 
          className="w-full bg-black text-white hover:bg-gray-800 text-xl rounded-xl py-[30px]"
        >
          {isLoading ? 'Creating account...' : 'Sign Up'}
        </Button>
        
        <div className="mt-auto text-center pt-8">
          <p className="text-gray-600">
            Already have an account?{' '}
            <button 
              type="button" 
              onClick={() => navigate('/login')} 
              className="text-zerodrive-purple hover:underline"
            >
              Login
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Signup;
