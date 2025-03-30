import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/context/AuthContext';
import { toast } from '@/components/ui/use-toast';
const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const {
    login
  } = useAuth();
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="min-h-screen bg-white p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">LOGIN ACCOUNT</h1>
        
      </div>
      
      <form onSubmit={handleLogin} className="flex-1 flex flex-col">
        <div className="mb-6">
          <label className="block text-gray-700 text-lg mb-2">Email</label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com" className="w-full p-4 text-lg rounded-xl py-[30px]" />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-lg mb-2">Password</label>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="w-full p-4 text-lg rounded-xl py-[30px]" />
        </div>
        
        <div className="text-right mb-6">
          <a href="#" className="text-zerodrive-purple hover:underline">
            Forgot password?
          </a>
        </div>
        
        <Button type="submit" disabled={isLoading} className="w-full bg-black text-white hover:bg-gray-800 py-6 text-xl rounded-xl">
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>
        
        <div className="mt-auto text-center pt-8">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <button type="button" onClick={() => navigate('/signup')} className="text-zerodrive-purple hover:underline">
              Sign up
            </button>
          </p>
        </div>
      </form>
    </div>;
};
export default Login;