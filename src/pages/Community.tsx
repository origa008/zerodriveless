
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { useAuth } from '@/lib/context/AuthContext';
import ReferralSystem from '@/components/community/ReferralSystem';
import CreatePost from '@/components/community/CreatePost';
import Post, { PostData } from '@/components/community/Post';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchPosts, createPost, subscribeToPostsUpdates } from '@/lib/utils/communityUtils';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const Community: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPosts, setFilteredPosts] = useState<PostData[]>([]);

  // Fetch posts when component mounts
  useEffect(() => {
    if (!user?.isLoggedIn) {
      navigate('/login');
      return;
    }
    
    loadPosts();
    
    // Subscribe to real-time post updates
    const unsubscribe = subscribeToPostsUpdates((updatedPosts) => {
      setPosts(updatedPosts);
    });
    
    return () => {
      unsubscribe();
    };
  }, [user, navigate]);
  
  // Filter posts based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPosts(posts);
      return;
    }
    
    const filtered = posts.filter(post => 
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setFilteredPosts(filtered);
  }, [searchQuery, posts]);
  
  const loadPosts = useCallback(async () => {
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
        setFilteredPosts(posts);
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
      
      <div className="relative mt-4 mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <Input 
          placeholder="Search posts..." 
          className="pl-10 bg-gray-50 border-gray-200"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
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
        ) : filteredPosts.length > 0 ? (
          filteredPosts.map(post => (
            <Post key={post.id} post={post} />
          ))
        ) : (
          <div className="text-center py-6 text-gray-500">
            {searchQuery ? "No posts match your search query" : "No posts yet. Be the first to share something with the community!"}
          </div>
        )}
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default Community;
