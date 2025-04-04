
import React, { useState } from 'react';
import { likePost } from '@/lib/utils/communityUtils';
import { useToast } from '@/hooks/use-toast';
import { ThumbsUp, MessageCircle } from 'lucide-react';

export type PostData = {
  id: string;
  author: {
    name: string;
    avatar?: string;
    time: string;
  };
  content: string;
  likes?: number;
  comments?: number;
};

type PostProps = {
  post: PostData;
};

const Post: React.FC<PostProps> = ({ post }) => {
  const { toast } = useToast();
  const [liking, setLiking] = useState(false);
  const [localLikes, setLocalLikes] = useState(post.likes || 0);
  
  const handleLike = async () => {
    if (liking) return;
    
    setLiking(true);
    try {
      const { success, error } = await likePost(post.id);
      
      if (success) {
        setLocalLikes(prev => prev + 1);
      } else if (error) {
        toast({
          title: "Couldn't like post",
          description: error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error liking post:', error);
    } finally {
      setLiking(false);
    }
  };
  
  return (
    <div className="bg-white border border-gray-200 p-4 rounded-2xl mb-4">
      <div className="flex items-center mb-4">
        <div className="w-12 h-12 rounded-full bg-gray-200 mr-4 overflow-hidden flex items-center justify-center">
          {post.author.avatar ? (
            <img src={post.author.avatar} alt={post.author.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-medium text-gray-500">
              {post.author.name.substring(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h3 className="font-medium">{post.author.name}</h3>
          <p className="text-gray-500 text-sm">{post.author.time}</p>
        </div>
      </div>
      <p className="whitespace-pre-line">{post.content}</p>
      
      <div className="flex items-center mt-4 text-gray-500 text-sm">
        <button 
          className={`flex items-center mr-4 hover:text-zerodrive-purple ${liking ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={handleLike}
          disabled={liking}
        >
          <ThumbsUp className="h-5 w-5 mr-1" />
          {localLikes} Likes
        </button>
        <button className="flex items-center hover:text-zerodrive-purple">
          <MessageCircle className="h-5 w-5 mr-1" />
          {post.comments || 0} Comments
        </button>
      </div>
    </div>
  );
};

export default Post;
