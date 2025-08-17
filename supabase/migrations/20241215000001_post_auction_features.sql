-- Add missing columns to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMP WITH TIME ZONE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS shipping_notes TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS processing_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create user_feedback table for post-auction feedback
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('buyer_to_seller', 'seller_to_buyer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for user_feedback
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feedback about themselves"
  ON user_feedback FOR SELECT
  USING (reviewee_id = auth.uid() OR reviewer_id = auth.uid());

CREATE POLICY "Users can create feedback for auctions they participated in"
  ON user_feedback FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM auctions 
      WHERE id = auction_id 
      AND (seller_id = auth.uid() OR winner_id = auth.uid())
    )
  );

-- Add email automation tracking
CREATE TABLE IF NOT EXISTS email_automation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  template_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for email_automation
ALTER TABLE email_automation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own emails"
  ON email_automation FOR SELECT
  USING (recipient_id = auth.uid());

-- Add invoice generation tracking
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,
  pdf_url TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('pending', 'generated', 'sent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoices for their transactions"
  ON invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      JOIN auctions a ON t.auction_id = a.id
      WHERE t.id = transaction_id 
      AND (a.seller_id = auth.uid() OR a.winner_id = auth.uid())
    )
  );

-- Update notifications enum to include new types
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'payment_completed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'item_shipped';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'item_delivered';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'feedback_received';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_feedback_auction_id ON user_feedback(auction_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_reviewer_id ON user_feedback(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_reviewee_id ON user_feedback(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_email_automation_recipient_id ON email_automation(recipient_id);
CREATE INDEX IF NOT EXISTS idx_email_automation_auction_id ON email_automation(auction_id);
CREATE INDEX IF NOT EXISTS idx_invoices_transaction_id ON invoices(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tracking_number ON transactions(tracking_number);
