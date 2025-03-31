
import React from 'react';
import { Button } from '@/components/ui/button';
import { PhoneCall, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ContactModalProps {
  onClose: () => void;
  role: 'driver' | 'passenger';
}

const ContactModal: React.FC<ContactModalProps> = ({ onClose, role }) => {
  const { toast } = useToast();

  const handleCall = () => {
    toast({
      title: "Calling...",
      description: `Connecting you to the ${role === 'driver' ? 'passenger' : 'driver'}`,
      duration: 3000
    });
    onClose();
  };
  
  const handleMessage = () => {
    toast({
      title: "Message sent",
      description: `Your message has been sent to the ${role === 'driver' ? 'passenger' : 'driver'}`,
      duration: 3000
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-xl font-medium mb-4">Contact {role === 'driver' ? 'Passenger' : 'Driver'}</h3>
        
        <div className="flex justify-center space-x-6 my-4">
          <button 
            onClick={handleCall}
            className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-full w-24 h-24"
          >
            <PhoneCall size={32} className="text-green-500 mb-2" />
            <span>Call</span>
          </button>
          
          <button
            onClick={handleMessage}
            className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-full w-24 h-24"
          >
            <MessageSquare size={32} className="text-blue-500 mb-2" />
            <span>Message</span>
          </button>
        </div>
        
        <Button 
          variant="outline" 
          className="w-full mt-4"
          onClick={onClose}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default ContactModal;
