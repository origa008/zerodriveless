
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Image as ImageIcon, Send } from 'lucide-react';

type CreatePostProps = {
  onPostCreated: (content: string) => void;
};

const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast({
        title: "Empty post",
        description: "Please write something to post",
        duration: 3000
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onPostCreated(content);
      setContent('');
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="bg-white border border-gray-200 p-4 rounded-2xl mb-6">
      <form onSubmit={handleSubmit}>
        <div className="flex items-start mb-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 mr-3 overflow-hidden flex-shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : null}
          </div>
          <textarea
            placeholder="Share your thoughts with the community..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg p-3 min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-zerodrive-purple/50"
          />
        </div>
        
        <div className="flex justify-between items-center">
          <button 
            type="button" 
            className="flex items-center text-gray-500 hover:text-zerodrive-purple"
          >
            <ImageIcon size={18} className="mr-1" />
            <span className="text-sm">Add Photo</span>
          </button>
          
          <Button 
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className="bg-zerodrive-purple text-white"
          >
            {isSubmitting ? (
              "Posting..."
            ) : (
              <>
                <Send size={16} className="mr-2" />
                Post
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;
