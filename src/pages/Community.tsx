
import React, { useState, useEffect } from 'react';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReferralCard from '@/components/community/ReferralCard';
import CreatePost from '@/components/community/CreatePost';
import CommunityPost from '@/components/community/CommunityPost';
import { CommunityPost as CommunityPostType } from '@/lib/types';

const Community: React.FC = () => {
  const navigate = useNavigate();
  const { user, addReferralEarning } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<CommunityPostType[]>([
    {
      id: '1',
      userId: '2',
      userName: 'Sarah J.',
      userAvatar: '/lovable-uploads/498e0bf1-4c8a-4cad-8ee2-6f43fdccc511.png',
      content: 'Just had the best driver! So friendly and professional. Love using ZeroDrive!',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      likes: 12,
      comments: 3
    },
    {
      id: '2',
      userId: '3',
      userName: 'Michael T.',
      userAvatar: '/lovable-uploads/498e0bf1-4c8a-4cad-8ee2-6f43fdccc511.png',
      content: 'Anyone else noticing faster arrival times lately? The app seems to be getting better!',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      likes: 8,
      comments: 5
    }
  ]);

  useEffect(() => {
    // Check for referral bonus simulation (for demo purposes)
    const hasReceivedBonus = localStorage.getItem('referral_bonus_received');
    if (!hasReceivedBonus) {
      // Simulate receiving a referral bonus
      setTimeout(() => {
        if (Math.random() > 0.5) { // 50% chance to get a bonus
          addReferralEarning(50);
          toast({
            title: "New Referral Bonus!",
            description: "You received RS 50 for your referral. Check your wallet!",
            duration: 5000
          });
          localStorage.setItem('referral_bonus_received', 'true');
        }
      }, 10000); // After 10 seconds
    }
  }, [addReferralEarning, toast]);

  const handleCreatePost = (content: string) => {
    if (!user) return;
    
    const newPost: CommunityPostType = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar || '/lovable-uploads/498e0bf1-4c8a-4cad-8ee2-6f43fdccc511.png',
      content,
      timestamp: new Date(),
      likes: 0,
      comments: 0
    };
    
    setPosts(prev => [newPost, ...prev]);
  };

  const handleLikePost = (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, likes: post.likes + 1 } : post
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-6 shadow-sm">
        <button onClick={() => navigate('/')} className="mb-4 flex items-center text-gray-800">
          <ArrowLeft size={20} className="mr-2" />
          Back
        </button>
        
        <h1 className="text-3xl font-bold mb-2">Community</h1>
        <p className="text-gray-600">Connect with other riders and drivers</p>
      </div>
      
      <div className="p-6">
        <ReferralCard />
        
        <CreatePost onPost={handleCreatePost} />
        
        <div className="space-y-4">
          {posts.map(post => (
            <CommunityPost
              key={post.id}
              avatar={post.userAvatar}
              name={post.userName}
              time={post.timestamp.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric', 
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
              })}
              content={post.content}
              likes={post.likes}
              comments={post.comments}
              onLike={() => handleLikePost(post.id)}
            />
          ))}
        </div>
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default Community;
