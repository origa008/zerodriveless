
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Trim inputs and validate
      const trimmedEmail = email.trim();
      
      if (!trimmedEmail || !password) {
        throw new Error('Please enter both email and password');
      }
      
      // Call login function
      await login(trimmedEmail, password);
      
      // Navigate to home page on success
      navigate('/');
      
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">LOGIN ACCOUNT</h1>
      </div>
      
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
            onClick={() => navigate('/reset-password')}
            className="text-zerodrive-purple hover:underline"
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
            <button 
              type="button" 
              onClick={() => navigate('/signup')} 
              className="text-zerodrive-purple hover:underline"
            >
              Sign up
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Login;
