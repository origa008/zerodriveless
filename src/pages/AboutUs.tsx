
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BottomNavigation from '@/components/layout/BottomNavigation';

const AboutUs: React.FC = () => {
  const navigate = useNavigate();

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
        
        <h1 className="text-2xl font-bold">About Us</h1>
        <p className="text-gray-300">Learn more about Zero Drive</p>
      </div>
      
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-xl font-medium mb-4">Our Mission</h2>
          <p className="text-gray-600 mb-4">
            At Zero Drive, we're committed to revolutionizing transportation in Pakistan with a zero-commission 
            ride-hailing platform that benefits both drivers and passengers.
          </p>
          <p className="text-gray-600">
            Our mission is to create a fair, transparent, and efficient transportation ecosystem 
            where drivers earn more and passengers pay less.
          </p>
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-medium mb-4">Our Story</h2>
          <p className="text-gray-600 mb-4">
            Founded in 2023, Zero Drive was born from a simple observation: ride-hailing platforms 
            were taking too much from drivers and charging too much to passengers.
          </p>
          <p className="text-gray-600">
            We started with a radical idea - what if we eliminated commissions entirely? 
            This would allow drivers to keep more of their earnings while 
            passengers enjoy lower fares. The result is Zero Drive, Pakistan's first 
            zero-commission ride-hailing service.
          </p>
        </div>
        
        <div>
          <h2 className="text-xl font-medium mb-4">Our Values</h2>
          <ul className="space-y-3 text-gray-600">
            <li className="flex">
              <span className="mr-2">•</span>
              <span><strong>Fairness:</strong> Zero commission, fair pricing, and transparent operations.</span>
            </li>
            <li className="flex">
              <span className="mr-2">•</span>
              <span><strong>Community:</strong> Building a supportive network of drivers and passengers.</span>
            </li>
            <li className="flex">
              <span className="mr-2">•</span>
              <span><strong>Innovation:</strong> Continuously improving our platform with cutting-edge technology.</span>
            </li>
            <li className="flex">
              <span className="mr-2">•</span>
              <span><strong>Accessibility:</strong> Making transportation affordable and available to all.</span>
            </li>
          </ul>
        </div>
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default AboutUs;
