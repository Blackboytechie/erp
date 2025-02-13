-- Create function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    year_prefix TEXT;
    next_number INTEGER;
BEGIN
    -- Get the current year as prefix (e.g., '2024')
    year_prefix := to_char(CURRENT_DATE, 'YYYY');
    
    -- Get the next number for this year
    SELECT COALESCE(MAX(SUBSTRING(order_number FROM 'PO-\d{4}-(\d+)')::INTEGER), 0) + 1
    INTO next_number
    FROM purchase_orders
    WHERE order_number LIKE 'PO-' || year_prefix || '-%';
    
    -- Format: PO-YYYY-XXXX (e.g., PO-2024-0001)
    NEW.order_number := 'PO-' || year_prefix || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN NEW;
END;
$$;

-- Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    gst_number TEXT,
    payment_terms INTEGER DEFAULT 30, -- days
    user_id UUID REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT
);

-- Set up RLS for suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can insert their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can update their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can delete their own suppliers" ON public.suppliers;

-- Create policies for suppliers
CREATE POLICY "Users can view their own suppliers"
    ON public.suppliers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own suppliers"
    ON public.suppliers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suppliers"
    ON public.suppliers FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suppliers"
    ON public.suppliers FOR DELETE
    USING (auth.uid() = user_id);

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    order_number TEXT UNIQUE NOT NULL DEFAULT 'PO-TEMP',
    supplier_id UUID REFERENCES public.suppliers(id),
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft',
    user_id UUID REFERENCES auth.users(id),
    expected_delivery_date DATE,
    payment_status VARCHAR(50) DEFAULT 'pending',
    shipping_address TEXT,
    notes TEXT
);

-- Create trigger to automatically generate order number
DROP TRIGGER IF EXISTS generate_order_number_trigger ON public.purchase_orders;
CREATE TRIGGER generate_order_number_trigger
    BEFORE INSERT ON public.purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_order_number();

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    gst_rate DECIMAL(5,2) DEFAULT 18.00,
    gst_amount DECIMAL(10,2) NOT NULL,
    received_quantity INTEGER DEFAULT 0
);

-- Set up RLS for purchase_order_items
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Users can insert their own purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Users can update their own purchase order items" ON public.purchase_order_items;

-- Create policies for purchase_order_items
CREATE POLICY "Users can view their own purchase order items"
    ON public.purchase_order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.purchase_orders
            WHERE id = purchase_order_items.purchase_order_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own purchase order items"
    ON public.purchase_order_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.purchase_orders
            WHERE id = purchase_order_items.purchase_order_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own purchase order items"
    ON public.purchase_order_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.purchase_orders
            WHERE id = purchase_order_items.purchase_order_id
            AND user_id = auth.uid()
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON public.suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_gst_number ON public.suppliers(gst_number);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON public.suppliers(status);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_user_id ON public.purchase_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at ON public.purchase_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_number ON public.purchase_orders(order_number);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order_id ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product_id ON public.purchase_order_items(product_id);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can insert their own purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can update their own purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can delete their own purchase orders" ON public.purchase_orders;

-- Create policies for purchase_orders
CREATE POLICY "Users can view their own purchase orders"
    ON public.purchase_orders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchase orders"
    ON public.purchase_orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own purchase orders"
    ON public.purchase_orders FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own purchase orders"
    ON public.purchase_orders FOR DELETE
    USING (auth.uid() = user_id);

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.purchase_order_items TO authenticated;

-- Grant USAGE on sequence
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated; 