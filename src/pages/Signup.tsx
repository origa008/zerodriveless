import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/context/AuthContext';
import { toast } from '@/components/ui/use-toast';
const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const {
    signup
  } = useAuth();
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signup(name, email, password);
      navigate('/');
    } catch (error) {
      toast({
        title: "Signup failed",
        description: "Please check your information and try again.",
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
        <div className="mb-6">
          <label className="block text-gray-700 text-lg mb-2">Full Name</label>
          <Input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="John Smith" className="w-full p-4 text-lg rounded-xl py-[30px]" />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-lg mb-2">Email</label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com" className="w-full p-4 text-lg rounded-xl py-[30px]" />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-lg mb-2">Password</label>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="w-full p-4 text-lg rounded-xl py-[30px]" />
        </div>
        
        <Button type="submit" disabled={isLoading} className="w-full bg-black text-white hover:bg-gray-800 text-xl rounded-xl py-[30px]">
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