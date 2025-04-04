
import { supabase } from "@/integrations/supabase/client";
import { Post } from "@/lib/types";
import { PostData } from "@/components/community/Post";
import { Database } from "@/integrations/supabase/types";

type PostRow = Database['public']['Tables']['posts']['Row'];

/**
 * Fetches all community posts
 */
export const fetchPosts = async (): Promise<{ posts: PostData[]; error: string | null }> => {
  try {
    // Fetch posts with author information
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:author_id (
          name,
          avatar
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return { posts: [], error: null };
    }
    
    // Map database records to PostData objects
    const posts: PostData[] = data.map((post: any) => ({
      id: post.id,
      author: {
        name: post.profiles?.name || 'Anonymous',
        avatar: post.profiles?.avatar,
        time: formatCreatedAt(post.created_at)
      },
      content: post.content,
      likes: post.likes,
      comments: post.comments
    }));
    
    return { posts, error: null };
  } catch (error: any) {
    console.error("Fetch posts error:", error.message);
    return { posts: [], error: error.message };
  }
};

/**
 * Creates a new community post
 */
export const createPost = async (authorId: string, content: string): Promise<{ post: PostData | null; error: string | null }> => {
  try {
    // Insert new post
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .insert({
        author_id: authorId,
        content,
        likes: 0,
        comments: 0
      })
      .select('*, profiles:author_id (name, avatar)')
      .single();
    
    if (postError) throw postError;
    
    if (!postData) {
      return { post: null, error: "Failed to create post" };
    }
    
    // Map to PostData object
    const post: PostData = {
      id: postData.id,
      author: {
        name: postData.profiles?.name || 'Anonymous',
        avatar: postData.profiles?.avatar as string | undefined,
        time: 'Just now'
      },
      content: postData.content,
      likes: 0,
      comments: 0
    };
    
    return { post, error: null };
  } catch (error: any) {
    console.error("Create post error:", error.message);
    return { post: null, error: error.message };
  }
};

/**
 * Likes a community post
 */
export const likePost = async (postId: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    // Update the likes count directly since the RPC function might not be available
    const { error } = await supabase
      .from('posts')
      .update({ likes: supabase.rpc('increment', { value: 1 }) })
      .eq('id', postId);
    
    if (error) throw error;
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Like post error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Helper to format timestamps
 */
const formatCreatedAt = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);
  
  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  
  return date.toLocaleDateString();
};
