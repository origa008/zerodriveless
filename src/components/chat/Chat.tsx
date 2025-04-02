
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, ArrowLeft, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/context/AuthContext';
import { Ride } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';

interface ChatProps {
  ride: Ride;
  onClose: () => void;
  onCall?: () => void;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

const Chat: React.FC<ChatProps> = ({ ride, onClose, onCall }) => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const otherParty = ride.driver?.id === user?.id ? ride.passenger : ride.driver;
  
  // Fetch chat messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!session?.user?.id || !ride.id) return;
      
      try {
        const { data, error } = await supabase
          .from('chats')
          .select('*')
          .eq('ride_id', ride.id)
          .order('created_at', { ascending: true });
        
        if (error) {
          throw error;
        }
        
        if (data) {
          setMessages(data);
          
          // Mark messages as read
          const unreadMessages = data.filter(
            msg => msg.receiver_id === session.user.id && !msg.is_read
          );
          
          if (unreadMessages.length > 0) {
            const unreadIds = unreadMessages.map(msg => msg.id);
            
            await supabase
              .from('chats')
              .update({ is_read: true })
              .in('id', unreadIds);
          }
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };
    
    fetchMessages();
    
    // Subscribe to new messages
    const channel = supabase
      .channel('chat-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chats',
          filter: `ride_id=eq.${ride.id}`
        },
        (payload) => {
          // Add the new message to the list
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
          
          // Mark message as read if it's for the current user
          if (newMsg.receiver_id === session?.user?.id) {
            supabase
              .from('chats')
              .update({ is_read: true })
              .eq('id', newMsg.id);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ride.id, session?.user?.id]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !session?.user?.id || !otherParty?.id) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('chats')
        .insert({
          ride_id: ride.id,
          sender_id: session.user.id,
          receiver_id: otherParty.id,
          message: newMessage.trim()
        });
      
      if (error) {
        throw error;
      }
      
      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black text-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={onClose} className="mr-3">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden mr-3">
              {otherParty?.avatar && (
                <img 
                  src={otherParty.avatar} 
                  alt={otherParty.name} 
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div>
              <h2 className="font-medium">{otherParty?.name || 'Unknown'}</h2>
              <p className="text-xs text-gray-300">
                {ride.driver?.id === user?.id ? 'Passenger' : 'Driver'}
              </p>
            </div>
          </div>
        </div>
        
        {onCall && otherParty?.phone && (
          <button 
            onClick={onCall}
            className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center"
          >
            <Phone size={18} />
          </button>
        )}
      </div>
      
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id}
              className={`mb-4 flex ${msg.sender_id === session?.user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`rounded-lg px-4 py-2 max-w-[80%] ${
                  msg.sender_id === session?.user?.id 
                    ? 'bg-black text-white' 
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                <p>{msg.message}</p>
                <p className={`text-xs mt-1 ${
                  msg.sender_id === session?.user?.id ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {formatTimestamp(msg.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>
      
      {/* Message input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex">
          <Input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 mr-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={isLoading || !newMessage.trim()}
            className="bg-black"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
