-- Finance Database Schema
-- Run this in Supabase SQL Editor to create all required tables

-- Users table (extends auth.users)
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  avatar_url text,
  subscription_tier text DEFAULT 'free'::text
    CHECK (subscription_tier = ANY (ARRAY['free'::text, 'pay_per_use'::text, 'unlimited'::text])),
  polar_customer_id text UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  subscription_id text,
  subscription_status text DEFAULT 'inactive'::text,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Chat sessions
CREATE TABLE public.chat_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL DEFAULT 'New Chat'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_message_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Chat messages
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid,
  role text NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])),
  content jsonb NOT NULL,
  tool_calls jsonb,
  token_usage jsonb,
  created_at timestamp with time zone DEFAULT now(),
  processing_time_ms integer,
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE
);

-- Charts
CREATE TABLE public.charts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  chart_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  anonymous_id text,
  CONSTRAINT charts_pkey PRIMARY KEY (id),
  CONSTRAINT charts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- CSVs
CREATE TABLE public.csvs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  title text NOT NULL,
  description text,
  headers text[] NOT NULL,
  rows jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  anonymous_id text,
  CONSTRAINT csvs_pkey PRIMARY KEY (id),
  CONSTRAINT csvs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Rate limits
CREATE TABLE public.user_rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  usage_count integer NOT NULL DEFAULT 0,
  reset_date text NOT NULL,
  last_request_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_rate_limits_pkey PRIMARY KEY (id),
  CONSTRAINT user_rate_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Collections (for saved research)
CREATE TABLE public.collections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT collections_pkey PRIMARY KEY (id),
  CONSTRAINT collections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Collection items
CREATE TABLE public.collection_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL,
  title text NOT NULL,
  url text CHECK (url IS NULL OR url ~* '^https?://'::text),
  source text,
  type text,
  occurred_at timestamp with time zone,
  data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT collection_items_pkey PRIMARY KEY (id),
  CONSTRAINT items_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_last_message ON public.chat_sessions(last_message_at DESC);
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_charts_user_id ON public.charts(user_id);
CREATE INDEX idx_csvs_user_id ON public.csvs(user_id);
CREATE INDEX idx_collections_user_id ON public.collections(user_id);
CREATE INDEX idx_collection_items_collection_id ON public.collection_items(collection_id);
