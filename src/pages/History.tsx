import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bike, Car, Clock, Calendar } from 'lucide-react';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { useAuth } from '@/lib/context/AuthContext';
import { fetchUserRideHistory } from '@/lib/utils/historyUtils';
import { Ride } from '@/lib/types';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const History: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'all' | 'rides' | 'drives'>('all');
  const [rideHistory, setRideHistory] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Redirect if not logged in
    if (!user?.isLoggedIn) {
      navigate('/login');
      return;
    }
    
    const loadRideHistory = async () => {
      setIsLoading(true);
      try {
        const { rides, error } = await fetchUserRideHistory(user.id);
        if (error) {
          toast({
            title: "Error loading history",
            description: error,
            variant: "destructive"
          });
          return;
        }
        
        setRideHistory(rides);
      } catch (error) {
        console.error("Failed to load ride history:", error);
        toast({
          title: "Failed to load history",
          description: "Please try again later",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRideHistory();
    
    // Set up a real-time subscription for new rides
    const subsChannel = supabase
      .channel('public:rides')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'rides',
          filter: `passenger_id=eq.${user.id}` 
        }, 
        () => {
          // Reload rides when changes occur
          loadRideHistory();
        }
      )
      .subscribe();
      
    return () => {
      subsChannel.unsubscribe();
    };
  }, [user, navigate, toast]);
  
  // Filter history based on active tab
  const filteredHistory = rideHistory.filter(item => {
    if (activeTab === 'all') return true;
    
    // For 'rides' tab, show where user is passenger (no driver ID or driver ID doesn't match user)
    if (activeTab === 'rides') {
      return !item.driver || item.driver.id !== user?.id;
    }
    
    // For 'drives' tab, show where user is driver (driver exists and driver ID matches user)
    if (activeTab === 'drives') {
      return !!item.driver && item.driver.id === user?.id;
    }
    
    return true;
  });

  const formatDate = (dateString?: Date | string) => {
    if (!dateString) return 'N/A';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return format(date, 'dd MMM yyyy, h:mm a');
  };

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
        
        <h1 className="text-2xl font-bold">Ride History</h1>
        <p className="text-gray-300">View your past trips</p>
      </div>
      
      <div className="p-6">
        <div className="flex border border-gray-200 rounded-lg mb-6 overflow-hidden">
          <button 
            className={`flex-1 py-3 text-center ${activeTab === 'all' ? 'bg-black text-white' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button 
            className={`flex-1 py-3 text-center ${activeTab === 'rides' ? 'bg-black text-white' : ''}`}
            onClick={() => setActiveTab('rides')}
          >
            Rides
          </button>
          <button 
            className={`flex-1 py-3 text-center ${activeTab === 'drives' ? 'bg-black text-white' : ''}`}
            onClick={() => setActiveTab('drives')}
          >
            Drives
          </button>
        </div>
        
        <div className="space-y-4">
          {isLoading ? (
            // Loading skeletons
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-6 w-full mb-3" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            ))
          ) : filteredHistory.length === 0 ? (
            <div className="text-center text-gray-500 py-6">
              <Clock className="mx-auto mb-2 text-gray-400" size={32} />
              <p className="mb-1">No history found</p>
              <p className="text-sm">Your ride history will appear here</p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <div className="flex items-center">
                    {item.driver?.id === user?.id ? (
                      <Car size={16} className="mr-2 text-gray-500" />
                    ) : (
                      <Bike size={16} className="mr-2 text-gray-500" />
                    )}
                    <span className="text-sm text-gray-500 capitalize">
                      {item.driver?.id === user?.id ? 'Drive' : 'Ride'}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar size={14} className="mr-1" />
                    {formatDate(item.startTime || item.endTime)}
                  </div>
                </div>
                
                <div className="mb-3">
                  <p className="font-medium">
                    {item.pickup.name || 'Unknown'} → {item.dropoff.name || 'Unknown'}
                  </p>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className={`text-sm px-2 py-1 rounded ${
                    item.status === 'completed' ? 'bg-green-100 text-green-800' : 
                    item.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {item.status.replace('_', ' ')}
                  </span>
                  <span className="font-bold">
                    {item.driver?.id === user?.id ? '+' : '-'} {item.currency} {item.price}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default History;
