-- Enable RLS on suppliers table
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can insert their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can update their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can delete their own suppliers" ON public.suppliers;

-- Create policies for suppliers
CREATE POLICY "Users can view suppliers"
    ON public.suppliers FOR SELECT
    TO authenticated
    USING (true);  -- Allow viewing all suppliers

CREATE POLICY "Users can insert their own suppliers"
    ON public.suppliers FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suppliers"
    ON public.suppliers FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suppliers"
    ON public.suppliers FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;

-- Function to get authenticated user ID
CREATE OR REPLACE FUNCTION get_auth_user_id()
RETURNS UUID
LANGUAGE SQL STABLE
SECURITY DEFINER
AS $$
  SELECT auth.uid();
$$;

-- Insert sample suppliers with fixed user_id for testing
DO $$ 
BEGIN
    INSERT INTO public.suppliers (
        name,
        email,
        phone,
        address,
        gst_number,
        payment_terms,
        status,
        notes,
        user_id
    ) VALUES 
        (
            'Tech Components Ltd',
            'sales@techcomponents.com',
            '+91 98765 43210',
            '123 Electronics Street, Tech Park, Bangalore 560001',
            '29ABCDE1234F1Z5',
            30,
            'active',
            'Primary supplier for electronic components',
            '5d39e893-6ec1-4282-8ce1-961eaa6fe8d9'  -- Using the specific user_id
        ),
        (
            'Global Hardware Solutions',
            'orders@globalhardware.com',
            '+91 87654 32109',
            '456 Industrial Area, Phase 2, Delhi 110020',
            '07FGHIJ5678K2Y6',
            45,
            'active',
            'Bulk hardware supplier with competitive prices',
            '5d39e893-6ec1-4282-8ce1-961eaa6fe8d9'  -- Using the specific user_id
        ),
        (
            'Premium Office Supplies',
            'contact@premiumoffice.com',
            '+91 76543 21098',
            '789 Commercial Complex, Mumbai 400001',
            '27KLMNO9012P3X7',
            15,
            'active',
            'Office supplies and furniture supplier',
            '5d39e893-6ec1-4282-8ce1-961eaa6fe8d9'  -- Using the specific user_id
        ),
        (
            'Reliable Electronics',
            'info@reliableelec.com',
            '+91 65432 10987',
            '321 Tech Hub, Chennai 600001',
            '33PQRST3456Q4W8',
            30,
            'active',
            'Specialized in computer peripherals',
            '5d39e893-6ec1-4282-8ce1-961eaa6fe8d9'  -- Using the specific user_id
        ),
        (
            'Quality Packaging Solutions',
            'sales@qualitypack.com',
            '+91 54321 09876',
            '654 Industrial Estate, Pune 411001',
            '27UVWXY7890R5V9',
            30,
            'active',
            'Packaging materials and solutions provider',
            '5d39e893-6ec1-4282-8ce1-961eaa6fe8d9'  -- Using the specific user_id
        ),
        (
            'Industrial Tools Co',
            'support@indtools.com',
            '+91 43210 98765',
            '987 Manufacturing Zone, Hyderabad 500001',
            '36BCDEF4567S6U0',
            60,
            'inactive',
            'Industrial tools and equipment supplier',
            '5d39e893-6ec1-4282-8ce1-961eaa6fe8d9'  -- Using the specific user_id
        ),
        (
            'Smart Tech Imports',
            'business@smarttech.com',
            '+91 32109 87654',
            '147 Import Export Zone, Kolkata 700001',
            '19GHIJK1234T7T1',
            45,
            'active',
            'International technology products supplier',
            '5d39e893-6ec1-4282-8ce1-961eaa6fe8d9'  -- Using the specific user_id
        ),
        (
            'Office Essentials',
            'care@officeessentials.com',
            '+91 21098 76543',
            '258 Business Center, Ahmedabad 380001',
            '24LMNOP5678U8S2',
            30,
            'active',
            'Complete office solutions provider',
            '5d39e893-6ec1-4282-8ce1-961eaa6fe8d9'  -- Using the specific user_id
        ),
        (
            'Digital Solutions Inc',
            'help@digitalsolutions.com',
            '+91 10987 65432',
            '369 IT Park, Bangalore 560002',
            '29QRSTU9012V9R3',
            30,
            'active',
            'Digital equipment and solutions',
            '5d39e893-6ec1-4282-8ce1-961eaa6fe8d9'  -- Using the specific user_id
        ),
        (
            'Green Office Supplies',
            'eco@greenoffice.com',
            '+91 09876 54321',
            '741 Eco Park, Mumbai 400002',
            '27VWXYZ3456W0Q4',
            15,
            'active',
            'Eco-friendly office supplies provider',
            '5d39e893-6ec1-4282-8ce1-961eaa6fe8d9'  -- Using the specific user_id
        );
END $$; 