
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Send } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { 
  sendMessage, 
  getChatMessages, 
  subscribeToChat 
} from '@/lib/utils/chatUtils';

interface ChatProps {
  rideId: string;
  partnerId: string;
  onClose: () => void;
}

const Chat: React.FC<ChatProps> = ({ rideId, partnerId, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load existing messages
  useEffect(() => {
    const loadMessages = async () => {
      setIsLoading(true);
      const { messages, error } = await getChatMessages(rideId);
      if (!error) {
        setMessages(messages);
      }
      setIsLoading(false);
    };
    
    loadMessages();
    
    // Subscribe to new messages
    const unsubscribe = subscribeToChat(rideId, (newMessage) => {
      setMessages(prev => [...prev, newMessage]);
    });
    
    return () => unsubscribe();
  }, [rideId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.id) return;
    
    try {
      await sendMessage(user.id, partnerId, rideId, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md h-[70vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-medium">Chat</h3>
          <button onClick={onClose} className="text-gray-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <p>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex justify-center items-center h-full text-gray-500">
              <p>No messages yet</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[75%] p-3 rounded-lg ${
                    msg.senderId === user?.id 
                      ? 'bg-blue-500 text-white rounded-br-none' 
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                  <p className={`text-xs mt-1 ${
                    msg.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1 border border-gray-300 rounded-l-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Type a message..."
              rows={2}
            />
            <Button 
              className="h-full rounded-l-none"
              disabled={!newMessage.trim()}
              onClick={handleSendMessage}
            >
              <Send size={20} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
