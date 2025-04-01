
import React, { useState, useEffect } from 'react';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { useAuth } from '@/lib/context/AuthContext';
import ReferralSystem from '@/components/community/ReferralSystem';
import CreatePost from '@/components/community/CreatePost';
import Post from '@/components/community/Post';
import { PostData } from '@/components/community/Post';
import { useNavigate } from 'react-router-dom';

const Community: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostData[]>([
    {
      id: '1',
      author: {
        name: 'Sarah J.',
        time: '2 hours ago'
      },
      content: 'Just had the best driver! So friendly and professional. Love using Zerodrive!',
      likes: 5,
      comments: 2
    },
    {
      id: '2',
      author: {
        name: 'Michael T.',
        time: 'Yesterday'
      },
      content: 'Anyone else noticing faster arrival times lately? The app seems to be getting better!',
      likes: 3,
      comments: 1
    }
  ]);

  const handlePostCreated = (newPost: PostData) => {
    setPosts([newPost, ...posts]);
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user?.isLoggedIn) {
      navigate('/login');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-white p-6 pb-20">
      <h1 className="text-3xl font-bold mb-6">Community</h1>
      
      <ReferralSystem />
      
      <div className="bg-zerodrive-purple/10 p-6 rounded-2xl mb-6">
        <h2 className="text-2xl font-medium mb-4">Connect with other riders</h2>
        <p className="text-gray-700 mb-4">
          Join the Zerodrive community to share tips, experiences, and connect with fellow riders.
        </p>
      </div>
      
      <CreatePost onPostCreated={handlePostCreated} />
      
      <div className="space-y-6">
        {posts.map(post => (
          <Post key={post.id} post={post} />
        ))}
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default Community;
