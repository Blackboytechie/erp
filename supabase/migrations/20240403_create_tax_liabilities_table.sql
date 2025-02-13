-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tax_liabilities table
CREATE TABLE IF NOT EXISTS tax_liabilities (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	tax_type TEXT NOT NULL,
	amount NUMERIC(15, 2) NOT NULL,
	due_date DATE NOT NULL,
	status TEXT CHECK (status IN ('paid', 'pending')) NOT NULL,
	user_id UUID REFERENCES auth.users(id),
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE tax_liabilities ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to access only their own tax liability data
CREATE POLICY "Users can access their own tax liability data" ON tax_liabilities
	FOR ALL USING (auth.uid() = user_id);