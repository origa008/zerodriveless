
import React, { useState, useEffect } from 'react';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { useAuth } from '@/lib/context/AuthContext';
import ReferralSystem from '@/components/community/ReferralSystem';
import CreatePost from '@/components/community/CreatePost';
import Post, { PostData } from '@/components/community/Post';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchPosts, createPost } from '@/lib/utils/communityUtils';
import { useToast } from '@/hooks/use-toast';

const Community: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch posts when component mounts
  useEffect(() => {
    if (user?.isLoggedIn) {
      loadPosts();
      
      // Subscribe to real-time post updates
      const channel = supabase
        .channel('public:posts')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'posts' 
          }, 
          () => {
            loadPosts();
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);
  
  const loadPosts = async () => {
    try {
      setLoading(true);
      const { posts, error } = await fetchPosts();
      if (error) {
        toast({
          title: "Error loading posts",
          description: error,
          variant: "destructive"
        });
      } else {
        setPosts(posts);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = async (content: string) => {
    if (!user?.id) return;
    
    try {
      const { post, error } = await createPost(user.id, content);
      if (error) {
        toast({
          title: "Error creating post",
          description: error,
          variant: "destructive"
        });
      } else if (post) {
        toast({
          title: "Post created!",
          description: "Your post has been published to the community"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error creating post",
        description: error.message,
        variant: "destructive"
      });
    }
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
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 p-4 rounded-2xl mb-4">
              <div className="flex items-center mb-4">
                <Skeleton className="w-12 h-12 rounded-full mr-4" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6 mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))
        ) : posts.length > 0 ? (
          posts.map(post => (
            <Post key={post.id} post={post} />
          ))
        ) : (
          <div className="text-center py-6 text-gray-500">
            No posts yet. Be the first to share something with the community!
          </div>
        )}
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default Community;
