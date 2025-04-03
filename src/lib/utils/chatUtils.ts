
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  rideId: string;
  message: string;
  createdAt: string;
  isRead: boolean;
};

/**
 * Sends a message between driver and passenger
 */
export const sendMessage = async (
  senderId: string,
  receiverId: string,
  rideId: string,
  message: string
): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase.from('chats').insert({
      sender_id: senderId,
      receiver_id: receiverId,
      ride_id: rideId,
      message,
      is_read: false
    });
    
    if (error) throw error;
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Message send error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Marks a message as read
 */
export const markMessageAsRead = async (messageId: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase
      .from('chats')
      .update({ is_read: true })
      .eq('id', messageId);
    
    if (error) throw error;
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Mark message as read error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Retrieves chat messages for a specific ride
 */
export const getChatMessages = async (rideId: string): Promise<{ messages: ChatMessage[]; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('ride_id', rideId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    const messages = data.map(msg => ({
      id: msg.id,
      senderId: msg.sender_id,
      receiverId: msg.receiver_id,
      rideId: msg.ride_id,
      message: msg.message,
      createdAt: msg.created_at,
      isRead: msg.is_read
    }));
    
    return { messages, error: null };
  } catch (error: any) {
    console.error("Get chat messages error:", error.message);
    return { messages: [], error: error.message };
  }
};

/**
 * Subscribes to real-time chat updates
 */
export const subscribeToChat = (
  rideId: string, 
  callback: (message: ChatMessage) => void
) => {
  const channel = supabase
    .channel(`chat:${rideId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chats',
        filter: `ride_id=eq.${rideId}`
      },
      (payload) => {
        const newMessage = payload.new as any;
        callback({
          id: newMessage.id,
          senderId: newMessage.sender_id,
          receiverId: newMessage.receiver_id,
          rideId: newMessage.ride_id,
          message: newMessage.message,
          createdAt: newMessage.created_at,
          isRead: newMessage.is_read
        });
      }
    )
    .subscribe();
    
  return () => {
    supabase.removeChannel(channel);
  };
};
