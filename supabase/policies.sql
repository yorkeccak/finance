-- Row Level Security Policies
-- Run this in Supabase SQL Editor after creating tables

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csvs ENABLE ROW LEVEL SECURITY;
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

-- Chat sessions policies (authenticated users only)
CREATE POLICY "Users can manage own sessions" ON public.chat_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Chat messages policies (authenticated users only)
CREATE POLICY "Users can manage own messages" ON public.chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- Charts policies (authenticated users only - no anonymous access)
CREATE POLICY "Users can view own charts" ON public.charts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own charts" ON public.charts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own charts" ON public.charts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own charts" ON public.charts
  FOR DELETE USING (auth.uid() = user_id);

-- CSVs policies (authenticated users only - no anonymous access)
CREATE POLICY "Users can view own csvs" ON public.csvs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own csvs" ON public.csvs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own csvs" ON public.csvs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own csvs" ON public.csvs
  FOR DELETE USING (auth.uid() = user_id);

-- Collections policies (authenticated users only)
CREATE POLICY "collections_select_own" ON public.collections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "collections_modify_own" ON public.collections
  FOR ALL USING (auth.uid() = user_id);

-- Collection items policies (authenticated users only)
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
