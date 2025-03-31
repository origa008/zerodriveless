
import React from 'react';
import { ThumbsUp, MessageCircle, Share } from 'lucide-react';

interface CommunityPostProps {
  avatar: string;
  name: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
}

const CommunityPost: React.FC<CommunityPostProps> = ({
  avatar,
  name,
  time,
  content,
  likes,
  comments,
  onLike,
  onComment,
  onShare
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
      <div className="flex items-center mb-3">
        <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
          <img 
            src={avatar} 
            alt={name} 
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h3 className="font-medium">{name}</h3>
          <p className="text-gray-500 text-sm">{time}</p>
        </div>
      </div>
      
      <p className="mb-4">{content}</p>
      
      <div className="flex justify-between text-gray-600 border-t border-gray-100 pt-3">
        <button 
          className="flex items-center"
          onClick={onLike}
        >
          <ThumbsUp size={18} className="mr-1" />
          <span>{likes}</span>
        </button>
        
        <button
          className="flex items-center"
          onClick={onComment}
        >
          <MessageCircle size={18} className="mr-1" />
          <span>{comments}</span>
        </button>
        
        <button
          className="flex items-center"
          onClick={onShare}
        >
          <Share size={18} className="mr-1" />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
};

export default CommunityPost;
