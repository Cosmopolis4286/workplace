/*
  # Fix Database Security and Performance Issues

  ## Overview
  This migration addresses performance and security issues:
  1. Optimize RLS policies by using subqueries for auth functions
  2. Add missing index for unindexed foreign key
  3. Remove unused indexes
  4. Fix function search_path configuration

  ## Changes

  ### 1. Foreign Key Index
  - Added index on `order_status_history.changed_by` for foreign key constraint

  ### 2. RLS Policy Optimization
  - Replaced direct `auth.uid()` calls with `(select auth.uid())` in all policies
  - Affects: notifications, orders, order_items, order_status_history tables
  - This prevents re-evaluation of auth functions for each row

  ### 3. Remove Unused Indexes
  - Removed 13 unused indexes that were not improving query performance
  - Indexes removed: idx_notifications_*, idx_orders_*, idx_order_items_*, idx_order_status_history_*

  ### 4. Function Search Path
  - Fixed `update_orders_updated_at()` function to have immutable search_path
*/

-- 1. Add missing index for unindexed foreign key
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_by 
  ON order_status_history(changed_by);

-- 2. Recreate policies with optimized auth function calls for notifications table
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can mark own notifications as read" ON notifications;
CREATE POLICY "Users can mark own notifications as read"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- 3. Recreate policies for orders table
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own orders" ON orders;
CREATE POLICY "Users can create own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own orders" ON orders;
CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own orders" ON orders;
CREATE POLICY "Users can delete own orders"
  ON orders FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- 4. Recreate policies for order_items table
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create order items for own orders" ON order_items;
CREATE POLICY "Users can create order items for own orders"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own order items" ON order_items;
CREATE POLICY "Users can update own order items"
  ON order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own order items" ON order_items;
CREATE POLICY "Users can delete own order items"
  ON order_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = (select auth.uid())
    )
  );

-- 5. Recreate policies for order_status_history table
DROP POLICY IF EXISTS "Users can view order status history for own orders" ON order_status_history;
CREATE POLICY "Users can view order status history for own orders"
  ON order_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_status_history.order_id 
      AND orders.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create status history for own orders" ON order_status_history;
CREATE POLICY "Users can create status history for own orders"
  ON order_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_status_history.order_id 
      AND orders.user_id = (select auth.uid())
    )
  );

-- 6. Remove unused indexes
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_created_at;
DROP INDEX IF EXISTS idx_notifications_user_read;
DROP INDEX IF EXISTS idx_orders_user_id;
DROP INDEX IF EXISTS idx_orders_order_number;
DROP INDEX IF EXISTS idx_orders_status;
DROP INDEX IF EXISTS idx_orders_scheduled_date;
DROP INDEX IF EXISTS idx_orders_created_at;
DROP INDEX IF EXISTS idx_orders_user_status;
DROP INDEX IF EXISTS idx_orders_user_created;
DROP INDEX IF EXISTS idx_order_items_order_id;
DROP INDEX IF EXISTS idx_order_status_history_order_id;

-- 7. Fix function search_path configuration
DROP FUNCTION IF EXISTS update_orders_updated_at() CASCADE;
CREATE FUNCTION update_orders_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Recreate trigger if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE event_object_table = 'orders' 
    AND trigger_name = 'update_orders_updated_at_trigger'
  ) THEN
    CREATE TRIGGER update_orders_updated_at_trigger
      BEFORE UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION update_orders_updated_at();
  END IF;
END $$;