# Supabase Database Setup Guide

## Current Issue
Your Supabase database has a `volunteers` table but no `users` table. The app needs a `users` table for user search and contact management.

## Solution Options

### Option 1: Create a Users Table (Recommended)

Run this SQL in your Supabase SQL Editor:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    phone TEXT,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your needs)
-- Allow users to read their own data
CREATE POLICY "Users can read own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Allow users to read all users (for search functionality)
CREATE POLICY "Users can read all users" ON public.users
    FOR SELECT USING (true);

-- Allow users to update their own data
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Create index for phone number searches
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_name ON public.users(name);

-- Create function to sync auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create user record on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sync existing auth users to public.users
INSERT INTO public.users (id, email, name, created_at)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)) as name,
    created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;
```

### Option 2: Use Volunteers Table Only (Current Implementation)

The code has been updated to use the `volunteers` table as a fallback. However, this has limitations:
- Only shows users who are volunteers
- May not have complete user information
- Email addresses won't be available

### Option 3: Create a View (Alternative)

If you don't want a separate users table, create a view:

```sql
CREATE OR REPLACE VIEW public.users AS
SELECT 
    v.user_id as id,
    COALESCE(v.name, split_part(u.email, '@', 1)) as name,
    v.phone,
    u.email,
    NULL as avatar_url,
    u.created_at
FROM public.volunteers v
LEFT JOIN auth.users u ON v.user_id = u.id;
```

## Additional Tables Needed

### Communities Table
```sql
CREATE TABLE IF NOT EXISTS public.communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    member_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all communities" ON public.communities
    FOR SELECT USING (true);

CREATE POLICY "Users can create communities" ON public.communities
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own communities" ON public.communities
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own communities" ON public.communities
    FOR DELETE USING (auth.uid() = created_by);
```

### Notifications Table
```sql
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT DEFAULT 'emergency',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);
```

## After Setup

1. Run the SQL scripts in your Supabase SQL Editor
2. Restart your Expo app: `npx expo start --clear`
3. Test user search functionality

## Notes

- The `users` table syncs automatically with `auth.users` via trigger
- Phone numbers should be stored in normalized format (digits only)
- RLS policies ensure data security
- Adjust policies based on your privacy requirements

