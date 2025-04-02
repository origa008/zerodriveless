
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { toast } = useToast();
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      // Form validation
      if (!name.trim()) {
        setErrorMessage("Name is required");
        setIsLoading(false);
        return;
      }
      
      if (!email.trim()) {
        setErrorMessage("Email is required");
        setIsLoading(false);
        return;
      }
      
      if (password.length < 6) {
        setErrorMessage("Password must be at least 6 characters long");
        setIsLoading(false);
        return;
      }
      
      if (!email.includes('@') || !email.includes('.')) {
        setErrorMessage("Please enter a valid email address");
        setIsLoading(false);
        return;
      }
      
      console.log("Submitting signup with:", { name, email, referralCode: referralCode || 'none' });
      
      // Pass referral code only if it exists and is not empty
      await signup(name, email, password, referralCode.trim() || null);
      
      toast({
        title: "Signup successful",
        description: "Your account has been created successfully.",
      });
      
      navigate('/');
    } catch (error: any) {
      console.error('Signup error:', error);
      setErrorMessage(error.message || "Signup failed. Please check your information and try again.");
      toast({
        title: "Signup failed",
        description: error.message || "Please check your information and try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return <div className="min-h-screen bg-white p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">CREATE ACCOUNT</h1>
      </div>
      
      <form onSubmit={handleSignup} className="flex-1 flex flex-col">
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {errorMessage}
          </div>
        )}
        
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
          <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters long</p>
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
            <button type="button" onClick={() => navigate('/login')} className="text-zerodrive-purple hover:underline">
              Login
            </button>
          </p>
        </div>
      </form>
    </div>;
};

export default Signup;
