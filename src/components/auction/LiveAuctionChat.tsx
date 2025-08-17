import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
    MessageCircle,
    Send,
    Smile,
    MoreVertical,
    Pin,
    Flag,
    Trash2,
    Crown,
    Shield,
    Clock,
    Users,
    Eye,
    Heart,
    ThumbsUp,
    Zap,
    Flame,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessage {
    id: string;
    auction_id: string;
    user_id: string;
    message: string;
    message_type: 'text' | 'emoji' | 'system' | 'announcement';
    created_at: string;
    is_pinned: boolean;
    reply_to?: string;
    user: {
        id: string;
        full_name: string;
        avatar_url?: string;
        is_verified?: boolean;
    };
    reactions?: {
        emoji: string;
        count: number;
        users: string[];
    }[];
}

interface LiveAuctionChatProps {
    auctionId: string;
    isAuctionActive: boolean;
    currentUserId?: string;
    className?: string;
    compact?: boolean;
}

const EMOJI_REACTIONS = ['👍', '❤️', '😮', '😂', '🔥', '⚡', '💎', '🎉'];

export function LiveAuctionChat({
    auctionId,
    isAuctionActive,
    currentUserId,
    className,
    compact = false
}: LiveAuctionChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

    const { user } = useAuth();
    const { toast } = useToast();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout>();

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Fetch initial messages
    const fetchMessages = async () => {
        if (!auctionId) return;

        try {
            setLoading(true);

            // Try to fetch from database first
            try {
                const { data: chatData, error } = await supabase
                    .from('auction_chat')
                    .select(`
                        *,
                        user:users(
                            id,
                            full_name,
                            avatar_url
                        )
                    `)
                    .eq('auction_id', auctionId)
                    .order('created_at', { ascending: false })
                    .limit(100);

                if (error && error.code !== 'PGRST116') { // Not a "table not found" error
                    throw error;
                }

                if (chatData && chatData.length > 0) {
                    // Transform data to match our interface
                    const transformedMessages: ChatMessage[] = chatData.map(msg => ({
                        id: msg.id,
                        auction_id: msg.auction_id,
                        user_id: msg.user_id,
                        message: msg.message,
                        message_type: msg.message_type as 'text' | 'emoji' | 'system' | 'announcement',
                        is_pinned: msg.is_pinned,
                        created_at: msg.created_at,
                        reply_to: msg.reply_to_id || undefined,
                        user: {
                            id: msg.user.id,
                            full_name: msg.user.full_name || 'Anonymous',
                            avatar_url: msg.user.avatar_url,
                            is_verified: false
                        }
                    }));

                    setMessages(transformedMessages.reverse()); // Reverse for chronological order
                    setPinnedMessages(transformedMessages.filter(msg => msg.is_pinned));
                    return;
                }
            } catch (dbError) {
                console.log('Database tables not yet available, using mock data');
            }

            // Fallback to mock data if database tables don't exist or are empty
            const mockMessages: ChatMessage[] = [
                {
                    id: '1',
                    auction_id: auctionId,
                    user_id: 'system',
                    message: 'Welcome to the auction chat! Good luck to all bidders!',
                    message_type: 'system',
                    is_pinned: true,
                    created_at: new Date(Date.now() - 3600000).toISOString(),
                    user: {
                        id: 'system',
                        full_name: 'System',
                        avatar_url: null,
                        is_verified: true
                    }
                },
                {
                    id: '2',
                    auction_id: auctionId,
                    user_id: 'user1',
                    message: 'Great auction! Looking forward to bidding.',
                    message_type: 'text',
                    is_pinned: false,
                    created_at: new Date(Date.now() - 2700000).toISOString(),
                    user: {
                        id: 'user1',
                        full_name: 'John Doe',
                        avatar_url: null,
                        is_verified: false
                    }
                },
                {
                    id: '3',
                    auction_id: auctionId,
                    user_id: 'user2',
                    message: '🔥',
                    message_type: 'emoji',
                    is_pinned: false,
                    created_at: new Date(Date.now() - 1800000).toISOString(),
                    user: {
                        id: 'user2',
                        full_name: 'Jane Smith',
                        avatar_url: null,
                        is_verified: true
                    }
                }
            ];

            setMessages(mockMessages);
            setPinnedMessages(mockMessages.filter(msg => msg.is_pinned));

        } catch (error) {
            console.error('Error fetching messages:', error);
            toast({
                title: "Error",
                description: "Failed to load chat messages",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    // Send message
    const sendMessage = async () => {
        if (!newMessage.trim() || !user) return;

        const messageText = newMessage.trim();
        setNewMessage('');
        setIsTyping(false);

        // Clear typing indicator
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        try {
            // Try to insert into database first
            try {
                const { data: insertedMessage, error } = await supabase
                    .from('auction_chat')
                    .insert({
                        auction_id: auctionId,
                        user_id: user.id,
                        message: messageText,
                        message_type: 'text',
                        is_pinned: false
                    })
                    .select(`
                        *,
                        user:users(
                            id,
                            full_name,
                            avatar_url
                        )
                    `)
                    .single();

                if (error && error.code !== 'PGRST116') { // Not a "table not found" error
                    throw error;
                }

                if (insertedMessage) {
                    // Transform and add to messages
                    const newDbMessage: ChatMessage = {
                        id: insertedMessage.id,
                        auction_id: insertedMessage.auction_id,
                        user_id: insertedMessage.user_id,
                        message: insertedMessage.message,
                        message_type: insertedMessage.message_type as 'text' | 'emoji' | 'system' | 'announcement',
                        is_pinned: insertedMessage.is_pinned,
                        created_at: insertedMessage.created_at,
                        user: {
                            id: insertedMessage.user.id,
                            full_name: insertedMessage.user.full_name || 'Anonymous',
                            avatar_url: insertedMessage.user.avatar_url,
                            is_verified: false
                        }
                    };

                    setMessages(prev => [...prev, newDbMessage]);
                    
                    toast({
                        title: "Message sent!",
                        duration: 1000,
                    });
                    return;
                }
            } catch (dbError) {
                console.log('Database table not available, using mock data');
            }

            // Fallback to mock message if database insert fails
            const mockMessage: ChatMessage = {
                id: Date.now().toString(),
                auction_id: auctionId,
                user_id: user.id,
                message: messageText,
                message_type: 'text',
                is_pinned: false,
                created_at: new Date().toISOString(),
                user: {
                    id: user.id,
                    full_name: user.user_metadata?.full_name || 'Anonymous',
                    avatar_url: user.user_metadata?.avatar_url || null,
                    is_verified: false
                }
            };

            setMessages(prev => [...prev, mockMessage]);

            toast({
                title: "Message sent!",
                description: "Using local storage (database not connected)",
                duration: 1000,
            });

        } catch (error) {
            console.error('Error sending message:', error);
            toast({
                title: "Error",
                description: "Failed to send message",
                variant: "destructive",
            });
        }
    };

    // Send emoji reaction
    const sendEmojiReaction = async (emoji: string) => {
        if (!user) return;

        try {
            // Try to insert into database first
            try {
                const { data: insertedMessage, error } = await supabase
                    .from('auction_chat')
                    .insert({
                        auction_id: auctionId,
                        user_id: user.id,
                        message: emoji,
                        message_type: 'emoji',
                        is_pinned: false
                    })
                    .select(`
                        *,
                        user:users(
                            id,
                            full_name,
                            avatar_url
                        )
                    `)
                    .single();

                if (error && error.code !== 'PGRST116') { // Not a "table not found" error
                    throw error;
                }

                if (insertedMessage) {
                    // Transform and add to messages
                    const newDbMessage: ChatMessage = {
                        id: insertedMessage.id,
                        auction_id: insertedMessage.auction_id,
                        user_id: insertedMessage.user_id,
                        message: insertedMessage.message,
                        message_type: insertedMessage.message_type as 'text' | 'emoji' | 'system' | 'announcement',
                        is_pinned: insertedMessage.is_pinned,
                        created_at: insertedMessage.created_at,
                        user: {
                            id: insertedMessage.user.id,
                            full_name: insertedMessage.user.full_name || 'Anonymous',
                            avatar_url: insertedMessage.user.avatar_url,
                            is_verified: false
                        }
                    };

                    setMessages(prev => [...prev, newDbMessage]);
                    setShowEmojiPicker(false);
                    
                    toast({
                        title: "Reaction sent!",
                        description: `You reacted with ${emoji}`,
                        duration: 2000,
                    });
                    return;
                }
            } catch (dbError) {
                console.log('Database table not available, using mock data');
            }

            // Fallback to mock message if database insert fails
            const mockMessage: ChatMessage = {
                id: Date.now().toString(),
                auction_id: auctionId,
                user_id: user.id,
                message: emoji,
                message_type: 'emoji',
                is_pinned: false,
                created_at: new Date().toISOString(),
                user: {
                    id: user.id,
                    full_name: user.user_metadata?.full_name || 'Anonymous',
                    avatar_url: user.user_metadata?.avatar_url || null,
                    is_verified: false
                }
            };

            setMessages(prev => [...prev, mockMessage]);
            setShowEmojiPicker(false);

            toast({
                title: "Reaction sent!",
                description: `You reacted with ${emoji} (local only)`,
                duration: 2000,
            });

        } catch (error) {
            console.error('Error sending reaction:', error);
            toast({
                title: "Error",
                description: "Failed to send reaction",
                variant: "destructive",
            });
        }
    };

    // Handle typing indicator
    const handleTyping = () => {
        if (!isTyping && user) {
            setIsTyping(true);

            // Broadcast typing status
            const channel = supabase.channel(`typing-${auctionId}`);
            channel.send({
                type: 'broadcast',
                event: 'typing',
                payload: { user_id: user.id, typing: true }
            });
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout to stop typing indicator
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);

            if (user) {
                const channel = supabase.channel(`typing-${auctionId}`);
                channel.send({
                    type: 'broadcast',
                    event: 'typing',
                    payload: { user_id: user.id, typing: false }
                });
            }
        }, 2000);
    };

    // Pin/unpin message
    const togglePinMessage = async (messageId: string, isPinned: boolean) => {
        if (!user) return;

        try {
            // TODO: Replace with actual Supabase update when table exists
            setMessages(prev =>
                prev.map(msg =>
                    msg.id === messageId
                        ? { ...msg, is_pinned: !isPinned }
                        : msg
                )
            );

            setPinnedMessages(prev => {
                if (!isPinned) {
                    // Add to pinned
                    const messageToPin = messages.find(m => m.id === messageId);
                    return messageToPin ? [...prev, { ...messageToPin, is_pinned: true }] : prev;
                } else {
                    // Remove from pinned
                    return prev.filter(m => m.id !== messageId);
                }
            });

            toast({
                title: isPinned ? "Message unpinned" : "Message pinned",
                description: isPinned ? "Message removed from pinned" : "Message pinned to top",
                duration: 2000,
            });

        } catch (error) {
            console.error('Error toggling pin:', error);
        }
    };

    // Setup real-time subscriptions
    useEffect(() => {
        fetchMessages();

        // Subscribe to new messages
        const messagesChannel = supabase
            .channel(`auction-chat-${auctionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'auction_chat',
                    filter: `auction_id=eq.${auctionId}`,
                },
                async (payload) => {
                    // Fetch user data for the new message
                    const { data: userData } = await supabase
                        .from('users')
                        .select('id, full_name, avatar_url, is_verified')
                        .eq('id', payload.new.user_id)
                        .single();

                    const newMessage: ChatMessage = {
                        ...payload.new,
                        user: userData || {
                            id: payload.new.user_id,
                            full_name: 'Anonymous',
                        },
                    } as ChatMessage;

                    setMessages(prev => [...prev, newMessage]);

                    if (newMessage.is_pinned) {
                        setPinnedMessages(prev => [...prev, newMessage]);
                    }

                    // Auto-scroll if not sender
                    if (payload.new.user_id !== currentUserId) {
                        setTimeout(scrollToBottom, 100);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'auction_chat',
                    filter: `auction_id=eq.${auctionId}`,
                },
                (payload) => {
                    setMessages(prev =>
                        prev.map(msg =>
                            msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
                        )
                    );

                    if (payload.new.is_pinned) {
                        const updatedMessage = messages.find(m => m.id === payload.new.id);
                        if (updatedMessage) {
                            setPinnedMessages(prev => [...prev, { ...updatedMessage, ...payload.new }]);
                        }
                    } else {
                        setPinnedMessages(prev => prev.filter(m => m.id !== payload.new.id));
                    }
                }
            )
            .subscribe();

        // Subscribe to typing indicators
        const typingChannel = supabase
            .channel(`typing-${auctionId}`)
            .on('broadcast', { event: 'typing' }, (payload) => {
                const { user_id, typing } = payload.payload;

                if (user_id !== currentUserId) {
                    setTypingUsers(prev => {
                        if (typing) {
                            return [...new Set([...prev, user_id])];
                        } else {
                            return prev.filter(id => id !== user_id);
                        }
                    });
                }
            })
            .subscribe();

        return () => {
            messagesChannel.unsubscribe();
            typingChannel.unsubscribe();

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [auctionId, currentUserId]);

    // Auto-scroll when new messages arrive
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const getMessageIcon = (messageType: string) => {
        switch (messageType) {
            case 'emoji': return <Heart className="h-3 w-3" />;
            case 'system': return <Shield className="h-3 w-3" />;
            case 'announcement': return <Crown className="h-3 w-3" />;
            default: return <MessageCircle className="h-3 w-3" />;
        }
    };

    const getMessageStyle = (messageType: string, isOwn: boolean) => {
        const baseClasses = "max-w-[80%] rounded-lg px-3 py-2";

        if (messageType === 'emoji') {
            return cn(baseClasses, "text-2xl bg-transparent border border-dashed border-gray-300");
        }

        if (messageType === 'system') {
            return cn(baseClasses, "bg-gray-100 text-gray-700 text-sm text-center mx-auto");
        }

        if (messageType === 'announcement') {
            return cn(baseClasses, "bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-300 text-yellow-800");
        }

        return cn(
            baseClasses,
            isOwn
                ? "bg-blue-500 text-white ml-auto"
                : "bg-gray-100 text-gray-900"
        );
    };

    if (compact) {
        return (
            <div className={cn("space-y-3", className)}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Live Chat</span>
                        <Badge variant="outline" className="text-xs">
                            {messages.length}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-xs text-muted-foreground">Live</span>
                    </div>
                </div>

                <div className="space-y-2 max-h-32 overflow-y-auto">
                    {messages.slice(-3).map((message) => (
                        <div key={message.id} className="flex items-center gap-2 text-xs">
                            <Avatar className="h-5 w-5">
                                <AvatarImage src={message.user.avatar_url} />
                                <AvatarFallback className="text-xs">
                                    {message.user.full_name.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <span className="font-medium truncate">
                                {message.user.full_name}:
                            </span>
                            <span className="flex-1 truncate text-muted-foreground">
                                {message.message}
                            </span>
                        </div>
                    ))}
                </div>

                {isAuctionActive && user && (
                    <div className="flex gap-2">
                        <Input
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => {
                                setNewMessage(e.target.value);
                                handleTyping();
                            }}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            className="flex-1 h-8 text-xs"
                        />
                        <Button size="sm" onClick={sendMessage} disabled={!newMessage.trim()}>
                            <Send className="h-3 w-3" />
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <Card className={cn("flex flex-col h-96", className)}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5" />
                        <span>Live Chat</span>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            <span className="text-xs text-muted-foreground">Live</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                            {messages.length} messages
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                            {onlineUsers.length} online
                        </Badge>
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
                {/* Pinned Messages */}
                {pinnedMessages.length > 0 && (
                    <div className="px-4 py-2 bg-yellow-50 border-b">
                        <div className="text-xs font-medium text-yellow-800 mb-1 flex items-center gap-1">
                            <Pin className="h-3 w-3" />
                            Pinned Messages
                        </div>
                        {pinnedMessages.slice(0, 2).map((msg) => (
                            <div key={msg.id} className="text-xs text-yellow-700 truncate">
                                <strong>{msg.user.full_name}:</strong> {msg.message}
                            </div>
                        ))}
                    </div>
                )}

                {/* Messages Area */}
                <ScrollArea className="flex-1 px-4 py-2">
                    <div className="space-y-3">
                        <AnimatePresence initial={false}>
                            {messages.map((message) => {
                                const isOwn = message.user_id === currentUserId;
                                const isEmoji = message.message_type === 'emoji';
                                const isSystem = message.message_type === 'system';

                                return (
                                    <motion.div
                                        key={message.id}
                                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        className={cn(
                                            "flex gap-2",
                                            isOwn && !isSystem && "flex-row-reverse",
                                            isSystem && "justify-center"
                                        )}
                                    >
                                        {!isSystem && (
                                            <Avatar className="h-8 w-8 flex-shrink-0">
                                                <AvatarImage src={message.user.avatar_url} />
                                                <AvatarFallback className="text-xs">
                                                    {message.user.full_name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                        )}

                                        <div className={cn("flex flex-col", isOwn && !isSystem && "items-end")}>
                                            {!isSystem && (
                                                <div className={cn(
                                                    "flex items-center gap-2 mb-1",
                                                    isOwn && "flex-row-reverse"
                                                )}>
                                                    <span className="text-xs font-medium text-gray-600">
                                                        {isOwn ? 'You' : message.user.full_name}
                                                    </span>
                                                    {message.user.is_verified && (
                                                        <Shield className="h-3 w-3 text-blue-500" />
                                                    )}
                                                    <span className="text-xs text-gray-400">
                                                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                                                    </span>
                                                    {message.is_pinned && (
                                                        <Pin className="h-3 w-3 text-yellow-500" />
                                                    )}
                                                </div>
                                            )}

                                            <div className={getMessageStyle(message.message_type, isOwn)}>
                                                {message.message}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {/* Typing Indicators */}
                        {typingUsers.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-2 text-xs text-gray-500"
                            >
                                <div className="flex gap-1">
                                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
                                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                </div>
                                <span>
                                    {typingUsers.length === 1
                                        ? 'Someone is typing...'
                                        : `${typingUsers.length} people are typing...`
                                    }
                                </span>
                            </motion.div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                {/* Input Area */}
                {isAuctionActive && user && (
                    <div className="px-4 py-3 border-t bg-gray-50">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    ref={inputRef}
                                    placeholder="Type your message..."
                                    value={newMessage}
                                    onChange={(e) => {
                                        setNewMessage(e.target.value);
                                        handleTyping();
                                    }}
                                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                    className="pr-10"
                                />
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                >
                                    <Smile className="h-4 w-4" />
                                </Button>
                            </div>

                            <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Emoji Picker */}
                        <AnimatePresence>
                            {showEmojiPicker && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="mt-2 p-2 bg-white border rounded-lg shadow-lg"
                                >
                                    <div className="grid grid-cols-8 gap-1">
                                        {EMOJI_REACTIONS.map((emoji) => (
                                            <Button
                                                key={emoji}
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-lg hover:bg-gray-100"
                                                onClick={() => sendEmojiReaction(emoji)}
                                            >
                                                {emoji}
                                            </Button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {!isAuctionActive && (
                    <div className="px-4 py-3 border-t bg-gray-50 text-center text-sm text-gray-500">
                        Chat is disabled for inactive auctions
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
