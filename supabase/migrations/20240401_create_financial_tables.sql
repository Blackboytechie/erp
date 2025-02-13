-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	name TEXT NOT NULL,
	category TEXT NOT NULL,
	amount NUMERIC(15, 2) NOT NULL,
	date DATE NOT NULL DEFAULT CURRENT_DATE,
	user_id UUID REFERENCES auth.users(id),
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create liabilities table
CREATE TABLE IF NOT EXISTS liabilities (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	name TEXT NOT NULL,
	category TEXT NOT NULL,
	amount NUMERIC(15, 2) NOT NULL,
	date DATE NOT NULL DEFAULT CURRENT_DATE,
	user_id UUID REFERENCES auth.users(id),
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create equity table
CREATE TABLE IF NOT EXISTS equity (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	name TEXT NOT NULL,
	category TEXT NOT NULL,
	amount NUMERIC(15, 2) NOT NULL,
	date DATE NOT NULL DEFAULT CURRENT_DATE,
	user_id UUID REFERENCES auth.users(id),
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to access only their own data
CREATE POLICY "Users can access their own financial data" ON assets
	FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own financial data" ON liabilities
	FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own financial data" ON equity
	FOR ALL USING (auth.uid() = user_id);