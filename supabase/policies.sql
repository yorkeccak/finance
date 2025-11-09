-- Row Level Security Policies
-- Run this in Supabase SQL Editor after creating tables

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for authenticated users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Enable update for authenticated users" ON public.users
  FOR UPDATE USING (true);

-- Chat sessions policies
CREATE POLICY "Users can manage own sessions" ON public.chat_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can manage own messages" ON public.chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- Charts policies (supports anonymous users)
CREATE POLICY "Users can view own charts" ON public.charts
  FOR SELECT USING (auth.uid() = user_id OR anonymous_id IS NOT NULL);

CREATE POLICY "Users can insert own charts" ON public.charts
  FOR INSERT WITH CHECK (auth.uid() = user_id OR anonymous_id IS NOT NULL);

CREATE POLICY "Users can update own charts" ON public.charts
  FOR UPDATE USING (auth.uid() = user_id OR anonymous_id IS NOT NULL);

CREATE POLICY "Users can delete own charts" ON public.charts
  FOR DELETE USING (auth.uid() = user_id OR anonymous_id IS NOT NULL);

CREATE POLICY "Anonymous users can view charts" ON public.charts
  FOR SELECT USING (anonymous_id IS NOT NULL);

CREATE POLICY "Anonymous users can insert charts" ON public.charts
  FOR INSERT WITH CHECK (anonymous_id IS NOT NULL);

CREATE POLICY "Anonymous users can update charts" ON public.charts
  FOR UPDATE USING (anonymous_id IS NOT NULL);

CREATE POLICY "Anonymous users can delete charts" ON public.charts
  FOR DELETE USING (anonymous_id IS NOT NULL);

-- CSVs policies (supports anonymous users)
CREATE POLICY "Users can view own csvs" ON public.csvs
  FOR SELECT USING (auth.uid() = user_id OR anonymous_id IS NOT NULL);

CREATE POLICY "Users can insert own csvs" ON public.csvs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR anonymous_id IS NOT NULL);

CREATE POLICY "Users can update own csvs" ON public.csvs
  FOR UPDATE USING (auth.uid() = user_id OR anonymous_id IS NOT NULL);

CREATE POLICY "Users can delete own csvs" ON public.csvs
  FOR DELETE USING (auth.uid() = user_id OR anonymous_id IS NOT NULL);

CREATE POLICY "Anonymous users can view csvs" ON public.csvs
  FOR SELECT USING (anonymous_id IS NOT NULL);

CREATE POLICY "Anonymous users can insert csvs" ON public.csvs
  FOR INSERT WITH CHECK (anonymous_id IS NOT NULL);

CREATE POLICY "Anonymous users can update csvs" ON public.csvs
  FOR UPDATE USING (anonymous_id IS NOT NULL);

CREATE POLICY "Anonymous users can delete csvs" ON public.csvs
  FOR DELETE USING (anonymous_id IS NOT NULL);

-- Rate limits policies
CREATE POLICY "Users can view their own rate limits" ON public.user_rate_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own rate limits" ON public.user_rate_limits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable read access for authenticated users" ON public.user_rate_limits
  FOR SELECT USING (true);

CREATE POLICY "Enable update for authenticated users" ON public.user_rate_limits
  FOR UPDATE USING (true);

CREATE POLICY "Enable rate limit creation via trigger" ON public.user_rate_limits
  FOR INSERT WITH CHECK (true);

-- Collections policies
CREATE POLICY "collections_select_own" ON public.collections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "collections_modify_own" ON public.collections
  FOR ALL USING (auth.uid() = user_id);

-- Collection items policies
CREATE POLICY "items_select_if_owns_parent" ON public.collection_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE collections.id = collection_items.collection_id
      AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "items_modify_if_owns_parent" ON public.collection_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE collections.id = collection_items.collection_id
      AND collections.user_id = auth.uid()
    )
  );
