# Supabase Database Setup

This directory contains SQL scripts for setting up the Finance database in Supabase.

## Quick Start

Run these scripts in order in your Supabase SQL Editor:

### 1. Create Tables (schema.sql)
```sql
-- Copy and paste the contents of schema.sql
-- This creates all tables: users, chat_sessions, chat_messages, charts, csvs, etc.
```

### 2. Set Up Row Level Security (policies.sql)
```sql
-- Copy and paste the contents of policies.sql
-- This sets up RLS policies for data security
```

### 3. Create Auth Triggers (triggers.sql)
```sql
-- Copy and paste the contents of triggers.sql
-- This creates triggers to sync auth.users with public.users automatically
```

## What Each Script Does

### schema.sql
- Creates the core database tables
- Sets up foreign key relationships
- Creates indexes for performance
- Tables: users, chat_sessions, chat_messages, charts, csvs, rate_limits, collections

### policies.sql
- Enables Row Level Security (RLS)
- Creates policies so users can only access their own data
- Ensures data privacy and security

### triggers.sql
- **Critical for user signup to work properly!**
- Automatically creates a record in `public.users` when someone signs up
- Keeps `auth.users` and `public.users` in sync
- Handles user updates and deletions

## Troubleshooting

### "No user found in database" after signup
- You forgot to run `triggers.sql`
- Run `triggers.sql` first, then `backfill-users.sql` to fix existing users

### Foreign key constraint errors
- Run scripts in order: schema.sql → policies.sql → triggers.sql
- Don't skip any scripts

### RLS policy blocking access
- Make sure policies.sql was run
- Check that the user is authenticated (has valid JWT)
- Verify the user exists in public.users table

## Verifying Setup

Run this query to verify everything is set up correctly:

```sql
-- Check that triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'on_auth_user_%';

-- Check user sync
SELECT
  (SELECT COUNT(*) FROM auth.users) as auth_users,
  (SELECT COUNT(*) FROM public.users) as public_users;

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

Expected results:
- 3 triggers: `on_auth_user_created`, `on_auth_user_updated`, `on_auth_user_deleted`
- auth_users count should equal public_users count
- All tables should have `rowsecurity = true`
