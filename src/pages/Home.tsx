
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Car, Clock, Users, Calendar, Activity, MapPin } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { CreateTestRideButton } from '@/components/CreateTestRideButton';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const features = [
    {
      icon: <Car className="h-6 w-6 text-blue-500" />,
      title: "Ride Requests",
      description: "View and accept ride requests from nearby passengers.",
      action: () => navigate('/ride-requests')
    },
    {
      icon: <Clock className="h-6 w-6 text-green-500" />,
      title: "Ride History",
      description: "View your completed and cancelled rides.",
      action: () => navigate('/ride-history')
    },
    {
      icon: <Users className="h-6 w-6 text-purple-500" />,
      title: "Passenger Mode",
      description: "Switch to passenger mode to request rides.",
      action: () => navigate('/passenger')
    },
    {
      icon: <Calendar className="h-6 w-6 text-amber-500" />,
      title: "Schedule Rides",
      description: "View and manage your scheduled rides.",
      action: () => navigate('/scheduled-rides')
    },
    {
      icon: <Activity className="h-6 w-6 text-red-500" />,
      title: "Earnings",
      description: "Track your earnings and payment history.",
      action: () => navigate('/earnings')
    },
    {
      icon: <MapPin className="h-6 w-6 text-cyan-500" />,
      title: "Current Ride",
      description: "View and manage your current ride.",
      action: () => navigate('/ride-progress')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center max-w-3xl mx-auto">
          <h1 className="text-xl font-bold">ZeroDriverless</h1>
          <div className="space-x-2">
            {user ? (
              <>
                <Button variant="ghost" onClick={() => navigate('/profile')}>Profile</Button>
                <Button variant="outline" onClick={() => navigate('/settings')}>Settings</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => navigate('/login')}>Login</Button>
                <Button onClick={() => navigate('/signup')}>Sign Up</Button>
              </>
            )}
          </div>
        </div>
      </header>
      
      <main className="max-w-3xl mx-auto p-4">
        <h2 className="text-2xl font-bold mb-6">Welcome to ZeroDriverless</h2>
        
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Quick Actions</h3>
            {import.meta.env.DEV && <CreateTestRideButton />}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6" onClick={feature.action}>
                  <div className="flex items-start space-x-4">
                    <div className="bg-gray-50 p-2 rounded-lg">
                      {feature.icon}
                    </div>
                    <div>
                      <h4 className="font-medium">{feature.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
        
        {import.meta.env.DEV && (
          <section className="mt-10 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="text-lg font-semibold mb-2">Development Tools</h3>
            <p className="text-sm text-gray-500 mb-4">
              These tools are only visible in development mode
            </p>
            <div className="flex flex-wrap gap-2">
              <CreateTestRideButton />
              <Button size="sm" variant="outline" onClick={() => navigate('/ride-requests')}>
                View Ride Requests
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Home;
