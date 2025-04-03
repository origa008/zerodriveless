
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const navigate = useNavigate();
  const { login, resetUserPassword, user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user?.isLoggedIn) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(email, password);
      navigate('/');
    } catch (error) {
      // Error is already handled in the login function
      console.error('Login error in component:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address to reset your password.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      await resetUserPassword(email);
      setShowForgotPassword(false);
    } catch (error) {
      // Error is already handled in the resetUserPassword function
      console.error('Password reset error in component:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col">
      <div className="mb-8">
        <button 
          onClick={() => showForgotPassword 
            ? setShowForgotPassword(false) 
            : navigate('/welcome')
          }
          className="flex items-center text-gray-600 mb-4"
        >
          <ArrowLeft size={20} className="mr-2" />
          {showForgotPassword ? 'Back to Login' : 'Back'}
        </button>
        
        <h1 className="text-3xl font-bold">
          {showForgotPassword ? 'RESET PASSWORD' : 'LOGIN ACCOUNT'}
        </h1>
      </div>
      
      {showForgotPassword ? (
        <form onSubmit={handleForgotPassword} className="flex-1 flex flex-col">
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Enter your email address and we'll send you a link to reset your password.
            </p>
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
          
          <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-black text-white hover:bg-gray-800 text-xl rounded-xl py-[30px]"
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="flex-1 flex flex-col">
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
          </div>
          
          <div className="text-right mb-6">
            <button 
              type="button"
              onClick={() => setShowForgotPassword(true)} 
              className="text-violet-600 hover:underline"
            >
              Forgot password?
            </button>
          </div>
          
          <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-black text-white hover:bg-gray-800 text-xl rounded-xl py-[30px]"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
          
          <div className="mt-auto text-center pt-8 py-0">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-violet-600 hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </form>
      )}
    </div>
  );
};

export default Login;
