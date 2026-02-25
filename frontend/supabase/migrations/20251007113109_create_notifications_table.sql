/*
  # Create notifications table

  ## Overview
  This migration creates a notifications system for the iFood Manager application.
  Users will receive real-time notifications for orders, deliveries, inventory alerts, and system updates.

  ## New Tables
  
  ### `notifications`
  Stores all user notifications with different types and priorities
  
  - `id` (uuid, primary key) - Unique identifier for each notification
  - `user_id` (uuid, foreign key) - References auth.users, the recipient of the notification
  - `type` (text) - Notification category: 'order', 'delivery', 'inventory', 'system', 'payment'
  - `title` (text) - Short notification title/headline
  - `message` (text) - Detailed notification message
  - `read` (boolean) - Whether the notification has been read (default: false)
  - `icon` (text) - Icon name to display (optional)
  - `color` (text) - Color theme for the notification (optional)
  - `link` (text) - Optional URL to navigate when clicked
  - `metadata` (jsonb) - Additional structured data (order_id, product_id, etc.)
  - `created_at` (timestamptz) - When the notification was created
  - `read_at` (timestamptz) - When the notification was marked as read

  ## Security
  
  - Enable RLS on notifications table
  - Users can only view their own notifications
  - Users can only update (mark as read) their own notifications
  - Users can only delete their own notifications
  - System can insert notifications for any user (using service role)

  ## Indexes
  
  - Index on user_id for fast notification queries per user
  - Index on created_at for sorting by date
  - Composite index on (user_id, read) for efficient unread count queries
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false NOT NULL,
  icon text DEFAULT 'BellIcon',
  color text DEFAULT 'gray',
  link text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  read_at timestamptz
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications as read"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
