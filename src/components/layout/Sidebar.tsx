
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  User,
  History,
  Package,
  Info,
  FileText,
  Shield,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { Button } from '@/components/ui/button';
import ProfileAvatar from '@/components/shared/ProfileAvatar';

type SidebarItem = {
  icon: React.ElementType;
  label: string;
  path: string;
};

const sidebarItems: SidebarItem[] = [
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: History, label: 'History', path: '/history' },
  { icon: Package, label: 'Partners', path: '/partners' },
  { icon: Info, label: 'About Us', path: '/about' },
  { icon: FileText, label: 'Policies', path: '/policies' },
  { icon: Shield, label: 'Official Driver', path: '/official-driver' },
  { icon: CreditCard, label: 'Wallet', path: '/wallet' },
];

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <>
      <button 
        className="absolute top-4 left-4 z-30 bg-white p-3 rounded-full shadow-md"
        onClick={toggleSidebar}
      >
        <Menu size={24} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={toggleSidebar} />
      )}

      <div 
        className={`fixed top-0 left-0 h-full w-72 bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Zero Drive</h2>
            <button onClick={toggleSidebar}>
              <X size={24} />
            </button>
          </div>

          {user && (
            <div className="flex items-center mb-8">
              <ProfileAvatar user={user} size="md" className="mr-4" />
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
          )}

          <nav>
            <ul className="space-y-4">
              {sidebarItems.map((item) => (
                <li key={item.label}>
                  <button
                    onClick={() => handleNavigate(item.path)}
                    className="flex items-center w-full p-3 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <item.icon size={20} className="mr-3" />
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="absolute bottom-8 left-0 right-0 px-6">
            <Button 
              variant="outline"
              className="w-full"
              onClick={logout}
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
