import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, MessageCircle, ShoppingBag, Wallet } from 'lucide-react';
const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  return;
};
export default BottomNavigation;