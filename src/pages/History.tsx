import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bike, Car } from 'lucide-react';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/context/AuthContext';
import { useRide } from '@/lib/context/RideContext';
import { Ride, Location } from '@/lib/types';
import { format } from 'date-fns';

const History: React.FC = () => {
  const { navigateToPage } = useRide();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'rides' | 'drives'>('all');
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchRideHistory = async () => {
      setIsLoading(true);
      try {
        // Fetch rides where user is either passenger or driver
        const { data, error } = await supabase
          .from('rides')
          .select(`
            id,
            passenger_id,
            driver_id,
            pickup_location,
            dropoff_location,
            price,
            status,
            created_at
          `)
          .or(`passenger_id.eq.${user.id},driver_id.eq.${user.id}`)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const formattedHistory = data.map(ride => {
          // Safely handle location data - make sure to handle both object and string formats
          let pickupName = 'Unknown location';
          let dropoffName = 'Unknown location';
          
          // Handle pickup location
          if (ride.pickup_location) {
            if (typeof ride.pickup_location === 'object' && ride.pickup_location.name) {
              pickupName = ride.pickup_location.name;
            } else if (typeof ride.pickup_location === 'string') {
              try {
                const parsed = JSON.parse(ride.pickup_location);
                pickupName = parsed.name || 'Unknown location';
              } catch (e) {
                // If parsing fails, keep the default
              }
            }
          }
          
          // Handle dropoff location
          if (ride.dropoff_location) {
            if (typeof ride.dropoff_location === 'object' && ride.dropoff_location.name) {
              dropoffName = ride.dropoff_location.name;
            } else if (typeof ride.dropoff_location === 'string') {
              try {
                const parsed = JSON.parse(ride.dropoff_location);
                dropoffName = parsed.name || 'Unknown location';
              } catch (e) {
                // If parsing fails, keep the default
              }
            }
          }
          
          return {
            id: ride.id,
            type: ride.passenger_id === user.id ? 'ride' : 'drive',
            date: format(new Date(ride.created_at), 'yyyy-MM-dd HH:mm'),
            from: pickupName,
            to: dropoffName,
            price: ride.price,
            status: ride.status
          };
        });
        
        setHistory(formattedHistory);
      } catch (error) {
        console.error('Error fetching ride history:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRideHistory();
  }, [user?.id, activeTab]);
  
  const filteredHistory = history.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'rides') return item.type === 'ride';
    if (activeTab === 'drives') return item.type === 'drive';
    return true;
  });

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-black text-white p-6">
        <button 
          onClick={() => navigateToPage('/')}
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
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          ) : filteredHistory.length === 0 ? (
            <p className="text-center text-gray-500 py-6">No history found</p>
          ) : (
            filteredHistory.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <div className="flex items-center">
                    {item.type === 'ride' ? (
                      <Bike size={16} className="mr-2 text-gray-500" />
                    ) : (
                      <Car size={16} className="mr-2 text-gray-500" />
                    )}
                    <span className="text-sm text-gray-500 capitalize">{item.type}</span>
                  </div>
                  <span className="text-sm text-gray-500">{item.date}</span>
                </div>
                
                <div className="mb-3">
                  <p className="font-medium">{item.from} → {item.to}</p>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className={`text-sm px-2 py-1 rounded ${
                    item.status === 'completed' ? 'bg-green-100 text-green-800' : 
                    item.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.status}
                  </span>
                  <span className="font-bold">
                    {item.type === 'ride' ? '-' : '+'} RS {item.price}
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
