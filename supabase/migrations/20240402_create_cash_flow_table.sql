-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create cash_flow_items table
CREATE TABLE IF NOT EXISTS cash_flow_items (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	description TEXT NOT NULL,
	amount NUMERIC(15, 2) NOT NULL,
	type TEXT CHECK (type IN ('operating', 'investing', 'financing')) NOT NULL,
	date DATE NOT NULL DEFAULT CURRENT_DATE,
	user_id UUID REFERENCES auth.users(id),
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE cash_flow_items ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to access only their own data
CREATE POLICY "Users can access their own cash flow data" ON cash_flow_items
	FOR ALL USING (auth.uid() = user_id);