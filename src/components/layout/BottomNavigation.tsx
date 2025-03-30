
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, MessageCircle, ShoppingBag, Wallet } from 'lucide-react';

const BottomNavigation: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-3 z-50">
      <Link to="/" className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}>
        <Home size={24} />
      </Link>
      
      <Link to="/community" className={`bottom-nav-item ${isActive('/community') ? 'active' : ''}`}>
        <MessageCircle size={24} />
      </Link>
      
      <Link to="/offers" className={`bottom-nav-item ${isActive('/offers') ? 'active' : ''}`}>
        <ShoppingBag size={24} />
      </Link>
      
      <Link to="/wallet" className={`bottom-nav-item ${isActive('/wallet') ? 'active' : ''}`}>
        <Wallet size={24} />
      </Link>
    </div>
  );
};

export default BottomNavigation;
