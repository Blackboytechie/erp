-- Create sales_orders table
CREATE TABLE IF NOT EXISTS public.sales_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.customers(id),
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    user_id UUID REFERENCES auth.users(id),
    delivery_date DATE,
    payment_status VARCHAR(50) DEFAULT 'pending',
    shipping_address TEXT,
    notes TEXT
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own sales orders"
    ON public.sales_orders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sales orders"
    ON public.sales_orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales orders"
    ON public.sales_orders FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create sales_order_items table for line items
CREATE TABLE IF NOT EXISTS public.sales_order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    gst_rate DECIMAL(5,2) DEFAULT 18.00,
    gst_amount DECIMAL(10,2) NOT NULL
);

-- Set up RLS for sales_order_items
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for sales_order_items
CREATE POLICY "Users can view their own sales order items"
    ON public.sales_order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sales_orders
            WHERE id = sales_order_items.sales_order_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own sales order items"
    ON public.sales_order_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sales_orders
            WHERE id = sales_order_items.sales_order_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own sales order items"
    ON public.sales_order_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.sales_orders
            WHERE id = sales_order_items.sales_order_id
            AND user_id = auth.uid()
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sales_orders_user_id ON public.sales_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_id ON public.sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_created_at ON public.sales_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order_id ON public.sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_product_id ON public.sales_order_items(product_id);

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.sales_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sales_order_items TO authenticated; 