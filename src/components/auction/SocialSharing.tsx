import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Heart,
  HeartOff,
  Share2,
  Twitter,
  Facebook,
  Instagram,
  Link2,
  Users,
  Eye,
  Star,
  MessageCircle,
  UserPlus,
  UserMinus,
  Copy,
  Download,
  Send,
  Bookmark,
  BookmarkCheck,
  Bell,
  BellOff,
  TrendingUp,
  Award,
  Crown,
} from 'lucide-react';

interface Auction {
  id: string;
  title: string;
  description: string;
  current_price: number;
  start_price: number;
  image_url?: string;
  end_time: string;
  seller_id: string;
  status: string;
  view_count?: number;
  like_count?: number;
  follower_count?: number;
  seller?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  following?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

interface SocialSharingProps {
  auction: Auction;
  compact?: boolean;
  showFollowing?: boolean;
  className?: string;
}

export function SocialSharing({
  auction,
  compact = false,
  showFollowing = true,
  className
}: SocialSharingProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFollowingSeller, setIsFollowingSeller] = useState(false);
  const [isWatchingAuction, setIsWatchingAuction] = useState(false);
  const [likeCount, setLikeCount] = useState(auction.like_count || 0);
  const [followerCount, setFollowerCount] = useState(auction.follower_count || 0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [followers, setFollowers] = useState<Follow[]>([]);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  // Generate share content
  const shareContent = {
    title: `${auction.title} - Live Auction`,
    description: `Check out this live auction! Current price: $${auction.current_price.toLocaleString()}`,
    url: `${window.location.origin}/auction/${auction.id}`,
    hashtags: ['auction', 'bidding', 'live', 'sale'],
    image: auction.image_url,
  };

  // Social platform share URLs
  const shareUrls = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareContent.title)}&url=${encodeURIComponent(shareContent.url)}&hashtags=${shareContent.hashtags.join(',')}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareContent.url)}`,
    instagram: `https://www.instagram.com/`, // Instagram doesn't support direct URL sharing
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareContent.url)}`,
    reddit: `https://reddit.com/submit?url=${encodeURIComponent(shareContent.url)}&title=${encodeURIComponent(shareContent.title)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(shareContent.url)}&text=${encodeURIComponent(shareContent.title)}`,
  };

  // Copy share link
  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareContent.url);
      toast({
        title: "Link copied!",
        description: "Share link has been copied to your clipboard",
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  // Download auction image
  const downloadImage = async () => {
    if (!auction.image_url) return;

    try {
      const response = await fetch(auction.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${auction.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Image downloaded",
        description: "Auction image has been saved to your device",
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Unable to download the image",
        variant: "destructive",
      });
    }
  };

  // Toggle like - Mock implementation
  const toggleLike = async () => {
    if (!user) return;

    try {
      setIsLiked(!isLiked);
      setLikeCount(prev => isLiked ? Math.max(0, prev - 1) : prev + 1);
      
      toast({
        title: isLiked ? "Removed like" : "Liked auction",
        description: isLiked ? 
          "You've removed your like from this auction." :
          "You've liked this auction!",
      });
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      });
    }
  };

  // Toggle bookmark - Mock implementation
  const toggleBookmark = async () => {
    if (!user) return;

    try {
      setIsBookmarked(!isBookmarked);

      toast({
        title: isBookmarked ? "Bookmark removed" : "Bookmark added",
        description: isBookmarked 
          ? "Removed from your bookmarks" 
          : "Added to your bookmarks",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  // Follow/unfollow seller - Mock implementation  
  const toggleFollowSeller = async () => {
    if (!user || !auction.seller_id) return;

    try {
      setIsFollowingSeller(!isFollowingSeller);
      setFollowerCount(prev => isFollowingSeller ? Math.max(0, prev - 1) : prev + 1);

      toast({
        title: isFollowingSeller ? "Unfollowed" : "Following",
        description: isFollowingSeller 
          ? "No longer following this seller" 
          : "You're now following this seller",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  // Watch/unwatch auction
  const toggleWatchAuction = async () => {
    if (!user) return;

    try {
      if (isWatchingAuction) {
        // Stop watching
        const { error } = await supabase
          .from('auction_watchers')
          .delete()
          .eq('auction_id', auction.id)
          .eq('user_id', user.id);

        if (error) throw error;

        setIsWatchingAuction(false);
      } else {
        // Start watching
        const { error } = await supabase
          .from('auction_watchers')
          .insert({
            auction_id: auction.id,
            user_id: user.id,
          });

        if (error) throw error;

        setIsWatchingAuction(true);
      }

      toast({
        title: isWatchingAuction ? "Stopped watching" : "Now watching",
        description: isWatchingAuction 
          ? "You'll no longer receive updates" 
          : "You'll get notified of important updates",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error toggling watch:', error);
    }
  };

  // Fetch followers - Mock implementation
  const fetchFollowers = async () => {
    if (!auction.seller_id) return;

    try {
      // Mock followers data
      const mockFollowers: Follow[] = [
        {
          id: '1',
          follower_id: 'user1',
          following_id: auction.seller_id,
          created_at: new Date().toISOString(),
          following: {
            id: 'user1',
            name: 'John Doe',
            avatar_url: '/placeholder.svg'
          }
        },
        {
          id: '2',
          follower_id: 'user2',
          following_id: auction.seller_id,
          created_at: new Date().toISOString(),
          following: {
            id: 'user2',
            name: 'Jane Smith',
            avatar_url: '/placeholder.svg'
          }
        }
      ];

      setFollowers(mockFollowers);
    } catch (error) {
      console.error('Error fetching followers:', error);
    }
  };

  // Check user's interaction status - Mock implementation
  const checkUserStatus = async () => {
    if (!user) return;

    try {
      // Mock data - replace with actual checks when tables exist
      setIsLiked(false);
      setIsBookmarked(false);
      setIsFollowingSeller(false);
      setIsWatchingAuction(false);
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  };

  // Share to social platform
  const shareToSocial = (platform: keyof typeof shareUrls) => {
    const url = shareUrls[platform];
    if (platform === 'instagram') {
      toast({
        title: "Instagram sharing",
        description: "Copy the link and share it on Instagram manually",
        duration: 3000,
      });
      copyShareLink();
    } else {
      window.open(url, '_blank', 'width=600,height=400');
    }
  };

  useEffect(() => {
    checkUserStatus();
  }, [user, auction.id]);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLike}
          className={cn(
            "flex items-center gap-1 text-sm",
            isLiked && "text-red-500"
          )}
        >
          {isLiked ? <Heart className="h-4 w-4 fill-current" /> : <Heart className="h-4 w-4" />}
          <span>{likeCount}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowShareModal(true)}
          className="flex items-center gap-1 text-sm"
        >
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleBookmark}
          className={cn(
            "flex items-center gap-1 text-sm",
            isBookmarked && "text-blue-500"
          )}
        >
          {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        </Button>

        {/* Share Modal */}
        <AnimatePresence>
          {showShareModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowShareModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-lg p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold mb-4">Share Auction</h3>
                
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <Button
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-auto p-3"
                    onClick={() => shareToSocial('twitter')}
                  >
                    <Twitter className="h-5 w-5 text-blue-500" />
                    <span className="text-xs">Twitter</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-auto p-3"
                    onClick={() => shareToSocial('facebook')}
                  >
                    <Facebook className="h-5 w-5 text-blue-600" />
                    <span className="text-xs">Facebook</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-auto p-3"
                    onClick={copyShareLink}
                  >
                    <Link2 className="h-5 w-5" />
                    <span className="text-xs">Copy Link</span>
                  </Button>
                </div>

                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    value={shareContent.url}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-gray-600"
                  />
                  <Button size="sm" onClick={copyShareLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Social & Sharing</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{auction.view_count || 0}</span>
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              <span>{likeCount}</span>
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Interaction Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={isLiked ? "default" : "outline"}
            size="sm"
            onClick={toggleLike}
            className={cn(
              "flex items-center gap-2",
              isLiked && "bg-red-500 hover:bg-red-600 text-white"
            )}
          >
            {isLiked ? <Heart className="h-4 w-4 fill-current" /> : <Heart className="h-4 w-4" />}
            <span>Like ({likeCount})</span>
          </Button>

          <Button
            variant={isBookmarked ? "default" : "outline"}
            size="sm"
            onClick={toggleBookmark}
            className={cn(
              "flex items-center gap-2",
              isBookmarked && "bg-blue-500 hover:bg-blue-600 text-white"
            )}
          >
            {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            <span>{isBookmarked ? "Bookmarked" : "Bookmark"}</span>
          </Button>

          <Button
            variant={isWatchingAuction ? "default" : "outline"}
            size="sm"
            onClick={toggleWatchAuction}
            className={cn(
              "flex items-center gap-2",
              isWatchingAuction && "bg-green-500 hover:bg-green-600 text-white"
            )}
          >
            {isWatchingAuction ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            <span>{isWatchingAuction ? "Watching" : "Watch"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </Button>
        </div>

        <Separator />

        {/* Seller Info & Follow */}
        {auction.seller && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={auction.seller.avatar_url} />
                <AvatarFallback>
                  {auction.seller.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{auction.seller.name}</p>
                <p className="text-sm text-gray-500">
                  {followerCount} followers
                </p>
              </div>
            </div>

            {user?.id !== auction.seller_id && (
              <Button
                variant={isFollowingSeller ? "outline" : "default"}
                size="sm"
                onClick={toggleFollowSeller}
                className="flex items-center gap-2"
              >
                {isFollowingSeller ? (
                  <>
                    <UserMinus className="h-4 w-4" />
                    <span>Unfollow</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Follow</span>
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2">
          {auction.image_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={downloadImage}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              <span>Save Image</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={copyShareLink}
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            <span>Copy Link</span>
          </Button>
        </div>

        {/* Share Modal */}
        <AnimatePresence>
          {showShareModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowShareModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-lg p-6 w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Share this auction</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowShareModal(false)}
                  >
                    ×
                  </Button>
                </div>

                {/* Preview */}
                <div className="mb-6 p-4 border rounded-lg">
                  <div className="flex gap-3">
                    {auction.image_url && (
                      <img
                        src={auction.image_url}
                        alt={auction.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{auction.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Current bid: ${auction.current_price.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">{shareContent.url}</p>
                    </div>
                  </div>
                </div>

                {/* Social Platforms */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <Button
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-auto p-4"
                    onClick={() => shareToSocial('twitter')}
                  >
                    <Twitter className="h-6 w-6 text-blue-500" />
                    <span className="text-sm">Twitter</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-auto p-4"
                    onClick={() => shareToSocial('facebook')}
                  >
                    <Facebook className="h-6 w-6 text-blue-600" />
                    <span className="text-sm">Facebook</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-auto p-4"
                    onClick={() => shareToSocial('linkedin')}
                  >
                    <TrendingUp className="h-6 w-6 text-blue-700" />
                    <span className="text-sm">LinkedIn</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-auto p-4"
                    onClick={() => shareToSocial('reddit')}
                  >
                    <MessageCircle className="h-6 w-6 text-orange-500" />
                    <span className="text-sm">Reddit</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-auto p-4"
                    onClick={() => shareToSocial('telegram')}
                  >
                    <Send className="h-6 w-6 text-blue-500" />
                    <span className="text-sm">Telegram</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-auto p-4"
                    onClick={copyShareLink}
                  >
                    <Link2 className="h-6 w-6" />
                    <span className="text-sm">Copy Link</span>
                  </Button>
                </div>

                {/* Share URL */}
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    value={shareContent.url}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-gray-600"
                  />
                  <Button size="sm" onClick={copyShareLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
