
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Eye, EyeOff, Gift } from 'lucide-react';

const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasReferral, setHasReferral] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { signup, user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user?.isLoggedIn) {
      navigate('/');
    }
  }, [user, navigate]);

  // Check for referral code in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('ref');
    if (code) {
      setReferralCode(code);
      setHasReferral(true);
    }
  }, [location]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both password fields match.",
        variant: "destructive"
      });
      return;
    }
    
    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      await signup(name, email, password, referralCode || undefined);
      navigate('/');
    } catch (error) {
      // Error is already handled in the signup function
      console.error('Signup error in component:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col">
      <div className="mb-8">
        <button 
          onClick={() => navigate('/welcome')}
          className="flex items-center text-gray-600 mb-4"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back
        </button>
        
        <h1 className="text-3xl font-bold">CREATE ACCOUNT</h1>
      </div>
      
      {hasReferral && (
        <div className="mb-6 bg-green-50 p-4 rounded-xl border border-green-200 flex items-center">
          <Gift className="text-green-500 mr-3" size={24} />
          <div>
            <p className="font-medium text-green-800">Referral Applied!</p>
            <p className="text-sm text-green-700">You're joining with a referral code</p>
          </div>
        </div>
      )}
      
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
          <div className="relative">
            <Input 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
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
          <label className="block text-gray-700 text-lg mb-2">Confirm Password</label>
          <Input 
            type={showPassword ? "text" : "password"} 
            value={confirmPassword} 
            onChange={e => setConfirmPassword(e.target.value)} 
            required 
            placeholder="••••••••" 
            className="w-full p-4 text-lg rounded-xl py-[30px]" 
          />
        </div>
        
        {!hasReferral && (
          <div className="mb-6">
            <label className="block text-gray-700 text-lg mb-2 flex items-center">
              <span>Referral Code</span>
              <span className="text-sm ml-2 text-gray-500">(Optional)</span>
            </label>
            <Input 
              type="text" 
              value={referralCode} 
              onChange={e => setReferralCode(e.target.value)} 
              placeholder="Enter referral code" 
              className="w-full p-4 text-lg rounded-xl py-[30px]" 
            />
          </div>
        )}
        
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
            <Link to="/login" className="text-violet-600 hover:underline">
              Login
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Signup;
