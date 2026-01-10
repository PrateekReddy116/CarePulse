-- SOS Notifications Table
CREATE TABLE IF NOT EXISTS sos_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES auth.users(id) NOT NULL,
    sender_name TEXT NOT NULL,
    sender_phone TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    message TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency Contacts Notifications Junction Table
-- Links SOS notifications to specific contacts
CREATE TABLE IF NOT EXISTS sos_notification_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID REFERENCES sos_notifications(id) ON DELETE CASCADE,
    recipient_phone TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sos_notifications_sender ON sos_notifications(sender_id);
CREATE INDEX IF NOT EXISTS idx_sos_notifications_status ON sos_notifications(status);
CREATE INDEX IF NOT EXISTS idx_sos_notifications_created ON sos_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_recipients_phone ON sos_notification_recipients(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_sos_recipients_read ON sos_notification_recipients(is_read);

-- Enable Row Level Security
ALTER TABLE sos_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_notification_recipients ENABLE ROW LEVEL SECURITY;

-- Policies for sos_notifications
CREATE POLICY "Users can create their own SOS notifications"
    ON sos_notifications FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view their own SOS notifications"
    ON sos_notifications FOR SELECT
    USING (auth.uid() = sender_id);

CREATE POLICY "Users can update their own SOS notifications"
    ON sos_notifications FOR UPDATE
    USING (auth.uid() = sender_id);

-- Policies for sos_notification_recipients
CREATE POLICY "Anyone can view notifications sent to them"
    ON sos_notification_recipients FOR SELECT
    USING (true);

CREATE POLICY "Recipients can update read status"
    ON sos_notification_recipients FOR UPDATE
    USING (true);

CREATE POLICY "Senders can create recipient records"
    ON sos_notification_recipients FOR INSERT
    WITH CHECK (true);
