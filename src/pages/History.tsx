
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bike, Car } from 'lucide-react';
import BottomNavigation from '@/components/layout/BottomNavigation';

type HistoryItem = {
  id: string;
  type: 'ride' | 'drive';
  date: string;
  from: string;
  to: string;
  price: number;
  status: 'completed' | 'cancelled';
};

const mockHistory: HistoryItem[] = [
  {
    id: 'hist1',
    type: 'ride',
    date: '2023-10-15 14:30',
    from: 'Gulberg III',
    to: 'Johar Town',
    price: 120,
    status: 'completed'
  },
  {
    id: 'hist2',
    type: 'drive',
    date: '2023-10-14 10:15',
    from: 'DHA Phase 5',
    to: 'Bahria Town',
    price: 220,
    status: 'completed'
  },
  {
    id: 'hist3',
    type: 'ride',
    date: '2023-10-12 18:45',
    from: 'Model Town',
    to: 'Liberty Market',
    price: 95,
    status: 'completed'
  },
  {
    id: 'hist4',
    type: 'drive',
    date: '2023-10-10 09:20',
    from: 'Allama Iqbal Town',
    to: 'Fortress Stadium',
    price: 185,
    status: 'cancelled'
  }
];

const History: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'rides' | 'drives'>('all');
  
  const filteredHistory = mockHistory.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'rides') return item.type === 'ride';
    if (activeTab === 'drives') return item.type === 'drive';
    return true;
  });

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
          {filteredHistory.length === 0 ? (
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
                    item.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
