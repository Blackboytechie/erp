-- Create inventory_transactions table
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    product_id UUID REFERENCES public.products(id),
    transaction_type VARCHAR(50) NOT NULL, -- 'purchase', 'sale', 'adjustment'
    quantity INTEGER NOT NULL,
    reference_type VARCHAR(50), -- 'purchase_order', 'sales_order', 'adjustment'
    reference_id UUID,
    notes TEXT,
    user_id UUID REFERENCES auth.users(id)
);

-- Set up RLS for inventory_transactions
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for inventory_transactions
CREATE POLICY "Users can view their own inventory transactions"
    ON public.inventory_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory transactions"
    ON public.inventory_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create inventory_adjustments table
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    adjustment_date DATE NOT NULL,
    reason VARCHAR(50) NOT NULL, -- 'damage', 'loss', 'correction'
    notes TEXT,
    user_id UUID REFERENCES auth.users(id)
);

-- Set up RLS for inventory_adjustments
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

-- Create policies for inventory_adjustments
CREATE POLICY "Users can view their own inventory adjustments"
    ON public.inventory_adjustments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory adjustments"
    ON public.inventory_adjustments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create inventory_adjustment_items table
CREATE TABLE IF NOT EXISTS public.inventory_adjustment_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    adjustment_id UUID REFERENCES public.inventory_adjustments(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    reason TEXT
);

-- Set up RLS for inventory_adjustment_items
ALTER TABLE public.inventory_adjustment_items ENABLE ROW LEVEL SECURITY;

-- Create policies for inventory_adjustment_items
CREATE POLICY "Users can view their own adjustment items"
    ON public.inventory_adjustment_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.inventory_adjustments
            WHERE id = inventory_adjustment_items.adjustment_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own adjustment items"
    ON public.inventory_adjustment_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.inventory_adjustments
            WHERE id = inventory_adjustment_items.adjustment_id
            AND user_id = auth.uid()
        )
    );

-- Create stock_alerts view
CREATE OR REPLACE VIEW public.stock_alerts AS
SELECT 
    p.id,
    p.name,
    p.sku,
    p.stock_quantity,
    p.reorder_level,
    p.user_id,
    CASE 
        WHEN p.stock_quantity <= p.reorder_level THEN 'below_reorder'
        WHEN p.stock_quantity = 0 THEN 'out_of_stock'
        ELSE 'normal'
    END as alert_status
FROM 
    public.products p
WHERE 
    p.stock_quantity <= p.reorder_level;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON public.inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_user_id ON public.inventory_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON public.inventory_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON public.inventory_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_user_id ON public.inventory_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_date ON public.inventory_adjustments(adjustment_date);

CREATE INDEX IF NOT EXISTS idx_inventory_adjustment_items_adjustment_id ON public.inventory_adjustment_items(adjustment_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustment_items_product_id ON public.inventory_adjustment_items(product_id);

-- Grant access to authenticated users
GRANT SELECT, INSERT ON public.inventory_transactions TO authenticated;
GRANT SELECT, INSERT ON public.inventory_adjustments TO authenticated;
GRANT SELECT, INSERT ON public.inventory_adjustment_items TO authenticated;
GRANT SELECT ON public.stock_alerts TO authenticated; 