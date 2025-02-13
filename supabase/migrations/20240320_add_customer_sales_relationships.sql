-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'sales_orders_customer_id_fkey'
    ) THEN
        ALTER TABLE public.sales_orders
        ADD CONSTRAINT sales_orders_customer_id_fkey
        FOREIGN KEY (customer_id) REFERENCES public.customers(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- Create or replace view for customer statistics with security barrier
CREATE OR REPLACE VIEW public.customer_statistics 
WITH (security_barrier=true) 
AS
SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    c.address,
    c.gst_number,
    c.created_at,
    c.user_id,
    COUNT(DISTINCT so.id) as total_orders,
    COALESCE(SUM(so.total_amount), 0) as total_revenue
FROM 
    public.customers c
LEFT JOIN 
    public.sales_orders so ON c.id = so.customer_id
WHERE 
    c.user_id = auth.uid()
GROUP BY 
    c.id, c.name, c.email, c.phone, c.address, c.gst_number, c.created_at, c.user_id;

-- Grant access to the view
GRANT SELECT ON public.customer_statistics TO authenticated; 