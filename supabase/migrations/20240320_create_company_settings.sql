-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can insert their own company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can update their own company settings" ON public.company_settings;

-- Create company_settings table
CREATE TABLE IF NOT EXISTS public.company_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    gst_number TEXT NOT NULL,
    invoice_prefix TEXT NOT NULL,
    logo_url TEXT,
    user_id UUID REFERENCES auth.users(id)
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own company settings"
    ON public.company_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company settings"
    ON public.company_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company settings"
    ON public.company_settings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_company_settings_user_id ON public.company_settings(user_id);

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.company_settings TO authenticated; 