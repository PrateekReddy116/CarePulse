-- ============================================
-- Travel Buddy Chat Tables Setup
-- Run this in your Supabase SQL Editor
-- ============================================

-- Chat Rooms Table
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    travel_request_id UUID REFERENCES public.travel_requests(id) ON DELETE CASCADE,
    user_ids UUID[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

-- Users can view chat rooms they are part of
CREATE POLICY "Users can view own chat rooms" ON public.chat_rooms
    FOR SELECT USING (auth.uid() = ANY(user_ids));

-- Users can create chat rooms (handled by service)
CREATE POLICY "Users can create chat rooms" ON public.chat_rooms
    FOR INSERT WITH CHECK (auth.uid() = ANY(user_ids));

-- Users can update chat rooms they are part of
CREATE POLICY "Users can update own chat rooms" ON public.chat_rooms
    FOR UPDATE USING (auth.uid() = ANY(user_ids));

CREATE INDEX IF NOT EXISTS idx_chat_rooms_travel_request_id ON public.chat_rooms(travel_request_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_user_ids ON public.chat_rooms USING GIN(user_ids);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in chat rooms they are part of
CREATE POLICY "Users can view messages in own chat rooms" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_rooms
            WHERE chat_rooms.id = chat_messages.chat_room_id
            AND auth.uid() = ANY(chat_rooms.user_ids)
        )
    );

-- Users can send messages in chat rooms they are part of
CREATE POLICY "Users can send messages in own chat rooms" ON public.chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.chat_rooms
            WHERE chat_rooms.id = chat_messages.chat_room_id
            AND auth.uid() = ANY(chat_rooms.user_ids)
        )
    );

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_room_id ON public.chat_messages(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- ============================================
-- Setup Complete!
-- ============================================
