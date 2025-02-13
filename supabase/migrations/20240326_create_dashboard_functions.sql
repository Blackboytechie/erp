-- Drop existing functions first
DROP FUNCTION IF EXISTS public.get_distribution_metrics();
DROP FUNCTION IF EXISTS public.get_top_customers(INTEGER);
DROP FUNCTION IF EXISTS public.get_top_products(INTEGER);
DROP FUNCTION IF EXISTS public.get_sales_trend(INTEGER);

-- Function to get distribution metrics
CREATE OR REPLACE FUNCTION public.get_distribution_metrics()
RETURNS TABLE (
    total_revenue DECIMAL(10,2),
    total_orders INTEGER,
    average_order_value DECIMAL(10,2),
    pending_orders INTEGER,
    low_stock_items INTEGER
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get the current user's ID
    current_user_id := auth.uid();
    
    RETURN QUERY
    WITH sales_metrics AS (
        SELECT 
            COALESCE(SUM(ii.total_amount), 0) as revenue,
            COUNT(DISTINCT i.id)::INTEGER as order_count,
            CASE 
                WHEN COUNT(DISTINCT i.id) > 0 THEN COALESCE(SUM(ii.total_amount), 0) / COUNT(DISTINCT i.id)
                ELSE 0
            END as avg_order_value
        FROM invoices i
        JOIN invoice_items ii ON i.id = ii.invoice_id
        WHERE i.user_id = current_user_id
        AND i.created_at >= NOW() - INTERVAL '30 days'
    ),
    pending_orders_count AS (
        SELECT COUNT(*)::INTEGER
        FROM sales_orders
        WHERE user_id = current_user_id
        AND status = 'pending'
    ),
    low_stock_count AS (
        SELECT COUNT(*)::INTEGER
        FROM products
        WHERE user_id = current_user_id
        AND stock_quantity <= reorder_level
    )
    SELECT 
        sm.revenue,
        sm.order_count,
        sm.avg_order_value,
        COALESCE(po.count, 0),
        COALESCE(ls.count, 0)
    FROM sales_metrics sm
    CROSS JOIN pending_orders_count po
    CROSS JOIN low_stock_count ls;
END;
$$;

-- Function to get top customers
CREATE OR REPLACE FUNCTION public.get_top_customers(limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
    name TEXT,
    total_orders INTEGER,
    total_revenue DECIMAL(10,2)
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get the current user's ID
    current_user_id := auth.uid();
    
    RETURN QUERY
    SELECT 
        c.name,
        COUNT(DISTINCT i.id)::INTEGER as total_orders,
        COALESCE(SUM(ii.total_amount), 0) as total_revenue
    FROM customers c
    LEFT JOIN invoices i ON c.id = i.customer_id
    LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
    WHERE c.user_id = current_user_id
    AND i.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY c.id, c.name
    ORDER BY total_revenue DESC
    LIMIT limit_count;
END;
$$;

-- Function to get top products
CREATE OR REPLACE FUNCTION public.get_top_products(limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
    name TEXT,
    category TEXT,
    total_quantity INTEGER,
    total_revenue DECIMAL(10,2)
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get the current user's ID
    current_user_id := auth.uid();
    
    RETURN QUERY
    SELECT 
        p.name,
        COALESCE(pc.name, 'Uncategorized') as category,
        COALESCE(SUM(ii.quantity), 0)::INTEGER as total_quantity,
        COALESCE(SUM(ii.total_amount), 0) as total_revenue
    FROM products p
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    LEFT JOIN invoice_items ii ON p.id = ii.product_id
    LEFT JOIN invoices i ON ii.invoice_id = i.id AND i.created_at >= NOW() - INTERVAL '30 days'
    WHERE p.user_id = current_user_id
    GROUP BY p.id, p.name, pc.name
    ORDER BY total_revenue DESC
    LIMIT limit_count;
END;
$$;


-- Function to get sales trend
CREATE OR REPLACE FUNCTION public.get_sales_trend(days_count INTEGER DEFAULT 30)
RETURNS TABLE (
    date DATE,
    revenue DECIMAL(10,2)
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get the current user's ID
    current_user_id := auth.uid();
    
    RETURN QUERY
    WITH RECURSIVE dates AS (
        SELECT 
            NOW()::DATE as sale_date
        UNION ALL
        SELECT 
            sale_date - 1
        FROM dates
        WHERE sale_date > NOW()::DATE - days_count
    )
    SELECT 
        d.sale_date as date,
        COALESCE(SUM(ii.total_amount), 0) as revenue
    FROM dates d
    LEFT JOIN invoices i ON DATE(i.created_at) = d.sale_date AND i.user_id = current_user_id
    LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
    GROUP BY d.sale_date
    ORDER BY d.sale_date;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_distribution_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_customers(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_products(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_trend(INTEGER) TO authenticated; 