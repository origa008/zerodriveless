
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatMessage } from '@/lib/types';
import { MessageSquare, Send, X } from 'lucide-react';
import { fetchChatMessages, sendChatMessage, markMessagesAsRead } from '@/lib/utils/supabaseUtils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ChatPanelProps {
  rideId: string;
  otherUserId: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ rideId, otherUserId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch messages when the panel is opened
  useEffect(() => {
    if (isOpen && user) {
      const loadMessages = async () => {
        setIsLoading(true);
        const chatMessages = await fetchChatMessages(rideId);
        setMessages(chatMessages);
        await markMessagesAsRead(rideId, user.id);
        setIsLoading(false);
        scrollToBottom();
      };

      loadMessages();
    }
  }, [isOpen, rideId, user]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!user || !rideId) return;

    const chatSubscription = supabase
      .channel('chats')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chats',
        filter: `ride_id=eq.${rideId}`
      }, async (payload) => {
        // Add new message to the list
        const newMsg = {
          id: payload.new.id,
          rideId: payload.new.ride_id,
          senderId: payload.new.sender_id,
          receiverId: payload.new.receiver_id,
          message: payload.new.message,
          isRead: payload.new.is_read,
          createdAt: new Date(payload.new.created_at),
        };
        
        setMessages(prev => [...prev, newMsg]);
        
        // Mark received messages as read
        if (user.id === payload.new.receiver_id) {
          await markMessagesAsRead(rideId, user.id);
        }
        
        scrollToBottom();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatSubscription);
    };
  }, [rideId, user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user) return;
    
    try {
      await sendChatMessage({
        rideId,
        senderId: user.id,
        receiverId: otherUserId,
        message: newMessage
      });
      
      setNewMessage('');
    } catch (error) {
      toast({
        title: "Message not sent",
        description: "Failed to send your message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const toggleChat = () => {
    setIsOpen(prev => !prev);
  };

  if (!isOpen) {
    return (
      <Button 
        onClick={toggleChat} 
        className="fixed bottom-20 right-4 z-30 h-12 w-12 rounded-full bg-black shadow-lg"
        aria-label="Open chat"
      >
        <MessageSquare size={20} />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-30 w-[90%] max-w-md h-[70vh] bg-white rounded-lg shadow-lg flex flex-col">
      <div className="p-3 bg-black text-white flex justify-between items-center rounded-t-lg">
        <h3 className="font-medium">Chat</h3>
        <Button variant="ghost" size="icon" onClick={toggleChat} className="h-8 w-8 text-white">
          <X size={18} />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <p>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-gray-500">
            <p>No messages yet</p>
          </div>
        ) : (
          messages.map(msg => (
            <div 
              key={msg.id} 
              className={`mb-2 max-w-[85%] ${msg.senderId === user?.id ? 'ml-auto' : 'mr-auto'}`}
            >
              <div 
                className={`p-3 rounded-lg ${
                  msg.senderId === user?.id 
                    ? 'bg-black text-white rounded-br-none' 
                    : 'bg-gray-100 text-black rounded-bl-none'
                }`}
              >
                {msg.message}
              </div>
              <div 
                className={`text-xs text-gray-500 mt-1 ${
                  msg.senderId === user?.id ? 'text-right' : 'text-left'
                }`}
              >
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 flex gap-2">
        <Input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" className="bg-black hover:bg-gray-800">
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
};

export default ChatPanel;
