
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Image, Send } from 'lucide-react';

interface CreatePostProps {
  onPost: (content: string) => void;
}

const CreatePost: React.FC<CreatePostProps> = ({ onPost }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [postCount, setPostCount] = useState(0);
  const [lastPostDate, setLastPostDate] = useState<Date | null>(null);
  
  const MAX_POSTS_PER_DAY = 2;

  const handlePost = () => {
    if (!content.trim()) {
      toast({
        title: "Can't post empty content",
        description: "Please write something before posting",
        duration: 3000
      });
      return;
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (lastPostDate) {
      const lastPostDay = new Date(
        lastPostDate.getFullYear(),
        lastPostDate.getMonth(),
        lastPostDate.getDate()
      );
      
      if (lastPostDay.getTime() === today.getTime()) {
        if (postCount >= MAX_POSTS_PER_DAY) {
          toast({
            title: "Daily limit reached",
            description: "You can only create 2 posts per day",
            duration: 3000
          });
          return;
        }
        
        setPostCount(prevCount => prevCount + 1);
      } else {
        // New day
        setPostCount(1);
      }
    } else {
      // First post ever
      setPostCount(1);
    }
    
    setLastPostDate(now);
    onPost(content);
    setContent('');
    
    toast({
      title: "Post created!",
      description: "Your post has been published to the community",
      duration: 3000
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
      <div className="flex items-center mb-3">
        <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
          <img 
            src={user?.avatar || '/lovable-uploads/498e0bf1-4c8a-4cad-8ee2-6f43fdccc511.png'} 
            alt={user?.name || 'User'} 
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-gray-500">Share your thoughts with the community...</p>
      </div>
      
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full border border-gray-200 rounded-lg p-3 min-h-[100px] mb-3 outline-none focus:border-blue-300"
        placeholder="What's on your mind?"
      ></textarea>
      
      <div className="flex justify-between items-center">
        <Button 
          variant="outline" 
          size="sm"
          className="text-gray-500"
        >
          <Image size={18} className="mr-1" />
          Add Photo
        </Button>
        
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-3">
            {MAX_POSTS_PER_DAY - postCount} posts left today
          </span>
          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handlePost}
            disabled={!content.trim() || postCount >= MAX_POSTS_PER_DAY}
          >
            <Send size={16} className="mr-1" />
            Post
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
