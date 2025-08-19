-- Create user_follows table for social following functionality
CREATE TABLE "public"."user_follows" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "follower_id" uuid NOT NULL,
    "following_id" uuid NOT NULL,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NULL,
    "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NULL,
    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "user_follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "user_follows_unique_follow" UNIQUE ("follower_id", "following_id"),
    CONSTRAINT "user_follows_no_self_follow" CHECK ("follower_id" <> "following_id")
);

-- Add RLS policies for user_follows
ALTER TABLE "public"."user_follows" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see all follows (for follower counts, etc.)
CREATE POLICY "Anyone can view follows" ON "public"."user_follows"
    FOR SELECT USING (true);

-- Policy: Users can only create follows for themselves
CREATE POLICY "Users can follow others" ON "public"."user_follows"
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Policy: Users can only delete their own follows
CREATE POLICY "Users can unfollow others" ON "public"."user_follows"
    FOR DELETE USING (auth.uid() = follower_id);

-- Create indexes for performance
CREATE INDEX "user_follows_follower_id_idx" ON "public"."user_follows" USING btree ("follower_id");
CREATE INDEX "user_follows_following_id_idx" ON "public"."user_follows" USING btree ("following_id");

-- Create notification function
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id uuid,
    p_type public.notification_type,
    p_title text,
    p_message text,
    p_auction_id uuid DEFAULT NULL,
    p_bid_id uuid DEFAULT NULL,
    p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_id uuid;
BEGIN
    -- Insert the notification
    INSERT INTO public.notifications (
        user_id,
        auction_id,
        bid_id,
        type,
        title,
        message,
        data,
        is_read,
        is_email_sent
    ) VALUES (
        p_user_id,
        p_auction_id,
        p_bid_id,
        p_type,
        p_title,
        p_message,
        p_data,
        false,
        false
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification TO service_role;
