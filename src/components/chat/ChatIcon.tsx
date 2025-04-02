
import React, { useState, useEffect } from 'react';
import { MessageSquare, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Ride } from '@/lib/types';
import Chat from './Chat';

interface ChatIconProps {
  ride: Ride;
  variant?: 'message' | 'both';
}

const ChatIcon: React.FC<ChatIconProps> = ({ ride, variant = 'both' }) => {
  const { user, session } = useAuth();
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Open the phone's dialer
  const handleCall = () => {
    // Determine which party to call
    const otherParty = ride.driver?.id === user?.id ? ride.passenger : ride.driver;
    
    if (otherParty?.phone) {
      window.location.href = `tel:${otherParty.phone}`;
    } else {
      alert('Phone number not available');
    }
  };
  
  // Fetch unread messages count
  useEffect(() => {
    if (!session?.user?.id || !ride.id) return;
    
    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase
          .from('chats')
          .select('*', { count: 'exact', head: true })
          .eq('ride_id', ride.id)
          .eq('receiver_id', session.user.id)
          .eq('is_read', false);
        
        if (error) {
          throw error;
        }
        
        setUnreadCount(count || 0);
      } catch (error) {
        console.error('Error fetching unread messages:', error);
      }
    };
    
    fetchUnreadCount();
    
    // Subscribe to new messages
    const channel = supabase
      .channel('chat-badge-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chats',
          filter: `ride_id=eq.${ride.id}`
        },
        (payload) => {
          // Update unread count if message is for current user
          if (payload.new.receiver_id === session.user.id && !payload.new.is_read) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ride.id, session?.user?.id]);
  
  // Mark messages as read when chat is opened
  const handleOpenChat = () => {
    setShowChat(true);
    
    // Reset unread count
    setUnreadCount(0);
  };

  return (
    <>
      <div className="fixed bottom-24 right-6 z-30 flex flex-col space-y-3">
        {variant === 'both' && (
          <Button
            onClick={handleCall}
            className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 p-0 shadow-lg"
          >
            <Phone size={24} />
          </Button>
        )}
        
        <Button
          onClick={handleOpenChat}
          className="w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 p-0 shadow-lg relative"
        >
          <MessageSquare size={24} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
              {unreadCount}
            </span>
          )}
        </Button>
      </div>
      
      {showChat && (
        <Chat 
          ride={ride} 
          onClose={() => setShowChat(false)} 
          onCall={variant === 'both' ? handleCall : undefined}
        />
      )}
    </>
  );
};

export default ChatIcon;
