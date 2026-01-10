-- Safety Heatmap Table
CREATE TABLE IF NOT EXISTS safety_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    safety_level TEXT NOT NULL CHECK (safety_level IN ('safe', 'caution', 'danger')),
    description TEXT,
    category TEXT, -- e.g., 'harassment', 'theft', 'assault', 'poor_lighting', 'other'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster location queries
CREATE INDEX IF NOT EXISTS idx_safety_reports_location ON safety_reports (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_safety_reports_created_at ON safety_reports (created_at DESC);

-- Enable Row Level Security
ALTER TABLE safety_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read safety reports
CREATE POLICY "Anyone can view safety reports"
    ON safety_reports FOR SELECT
    USING (true);

-- Policy: Authenticated users can insert safety reports
CREATE POLICY "Authenticated users can create safety reports"
    ON safety_reports FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can update their own reports
CREATE POLICY "Users can update own safety reports"
    ON safety_reports FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own reports
CREATE POLICY "Users can delete own safety reports"
    ON safety_reports FOR DELETE
    USING (auth.uid() = user_id);
