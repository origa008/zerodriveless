
import React from 'react';

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
  return (
    <div className="bg-white border border-gray-200 p-4 rounded-2xl mb-4">
      <div className="flex items-center mb-4">
        <div className="w-12 h-12 rounded-full bg-gray-200 mr-4 overflow-hidden">
          {post.author.avatar ? (
            <img src={post.author.avatar} alt={post.author.name} className="w-full h-full object-cover" />
          ) : null}
        </div>
        <div>
          <h3 className="font-medium">{post.author.name}</h3>
          <p className="text-gray-500 text-sm">{post.author.time}</p>
        </div>
      </div>
      <p>{post.content}</p>
      
      <div className="flex items-center mt-4 text-gray-500 text-sm">
        <button className="flex items-center mr-4 hover:text-zerodrive-purple">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          {post.likes || 0} Likes
        </button>
        <button className="flex items-center hover:text-zerodrive-purple">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {post.comments || 0} Comments
        </button>
      </div>
    </div>
  );
};

export default Post;
