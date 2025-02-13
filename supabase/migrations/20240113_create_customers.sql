-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    address TEXT,
    gst_number TEXT UNIQUE,
    credit_limit DECIMAL(10,2) DEFAULT 0,
    payment_terms INTEGER DEFAULT 30, -- days
    user_id UUID REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own customers"
    ON public.customers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customers"
    ON public.customers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customers"
    ON public.customers FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_gst_number ON public.customers(gst_number);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;

-- Create customer_contacts table for multiple contact persons
CREATE TABLE IF NOT EXISTS public.customer_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    designation TEXT,
    email TEXT,
    phone TEXT,
    is_primary BOOLEAN DEFAULT false
);

-- Set up RLS for customer_contacts
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for customer_contacts
CREATE POLICY "Users can view their customer contacts"
    ON public.customer_contacts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.customers
            WHERE id = customer_contacts.customer_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their customer contacts"
    ON public.customer_contacts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.customers
            WHERE id = customer_contacts.customer_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their customer contacts"
    ON public.customer_contacts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.customers
            WHERE id = customer_contacts.customer_id
            AND user_id = auth.uid()
        )
    );

-- Create indexes for customer_contacts
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON public.customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_is_primary ON public.customer_contacts(is_primary);

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.customer_contacts TO authenticated; 