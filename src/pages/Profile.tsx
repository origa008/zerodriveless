
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, MapPin, Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { useToast } from '@/hooks/use-toast';

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [driverMode, setDriverMode] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || 'Lahore, Pakistan',
  });

  // Check for phone number on component load
  useEffect(() => {
    if (user && !user.phone) {
      toast({
        title: "Profile incomplete",
        description: "Please update your profile with your phone number and address",
        duration: 5000
      });
    }
  }, [user, toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validatePhoneNumber = (phone: string) => {
    return phone.length === 11 && /^\d+$/.test(phone);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePhoneNumber(formData.phone)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid 11-digit phone number",
        variant: "destructive",
        duration: 3000
      });
      return;
    }
    
    if (!formData.address.trim()) {
      toast({
        title: "Address required",
        description: "Please enter your home address",
        variant: "destructive",
        duration: 3000
      });
      return;
    }
    
    // In a real app, you would update the user data here
    setIsEditing(false);
    
    toast({
      title: "Profile updated",
      description: "Your profile has been successfully updated",
      duration: 3000
    });
    
    // Just for demo purposes, we'll console log the updated data
    console.log('Updated profile:', formData);
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-black text-white p-6">
        <button 
          onClick={() => navigate('/')}
          className="mb-4 flex items-center text-white"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back
        </button>
        
        <div className="flex items-center">
          <div className="w-20 h-20 rounded-full overflow-hidden mr-4">
            <img 
              src={user.avatar || '/lovable-uploads/498e0bf1-4c8a-4cad-8ee2-6f43fdccc511.png'} 
              alt={user.name} 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{formData.name}</h1>
            <p className="text-gray-300">Account Profile</p>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {isEditing ? (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
                  <User size={18} className="text-gray-500 mr-2" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="flex-1 outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
                  <Mail size={18} className="text-gray-500 mr-2" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="flex-1 outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number *</label>
                <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
                  <Phone size={18} className="text-gray-500 mr-2" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="e.g., 03001234567"
                    maxLength={11}
                    className="flex-1 outline-none"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Enter your 11-digit number without dashes or spaces</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Home Address *</label>
                <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
                  <MapPin size={18} className="text-gray-500 mr-2" />
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="flex-1 outline-none"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-black text-white"
              >
                Save Changes
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              <div className="flex items-center border border-gray-100 rounded-lg p-3">
                <User size={18} className="text-gray-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p>{formData.name}</p>
                </div>
              </div>
              
              <div className="flex items-center border border-gray-100 rounded-lg p-3">
                <Mail size={18} className="text-gray-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Email Address</p>
                  <p>{formData.email}</p>
                </div>
              </div>
              
              <div className="flex items-center border border-gray-100 rounded-lg p-3">
                <Phone size={18} className="text-gray-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Phone Number</p>
                  {formData.phone ? (
                    <p>{formData.phone}</p>
                  ) : (
                    <p className="text-red-500">Not provided (Required)</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center border border-gray-100 rounded-lg p-3">
                <MapPin size={18} className="text-gray-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Home Address</p>
                  <p>{formData.address}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between border border-gray-100 rounded-lg p-3 mb-6">
              <div className="flex items-center">
                <Shield size={18} className="text-gray-500 mr-3" />
                <div>
                  <p className="font-medium">Driver Status</p>
                  <p className="text-sm text-gray-500">Toggle to enable driver mode</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={driverMode}
                  onChange={() => setDriverMode(!driverMode)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
              </label>
            </div>
            
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={logout}
              >
                Logout
              </Button>
            </div>
          </>
        )}
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default Profile;
