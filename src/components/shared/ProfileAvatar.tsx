
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from '@/lib/types';

interface ProfileAvatarProps {
  user: User | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const DEFAULT_AVATAR = '/lovable-uploads/default_avatar.png';

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ 
  user, 
  size = 'md',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20',
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : '?';

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      <AvatarImage 
        src={user?.avatar || DEFAULT_AVATAR} 
        alt={user?.name || 'User'} 
      />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
};

export default ProfileAvatar;
