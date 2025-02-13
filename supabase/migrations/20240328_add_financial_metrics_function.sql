-- Note: The get_financial_metrics function is already defined in 20240320_create_financial_functions.sql
-- This file is not needed and can be safely removed.

-- Create function to get financial metrics
CREATE OR REPLACE FUNCTION public.get_financial_metrics()
RETURNS TABLE (
	total_revenue DECIMAL(10,2),
	total_receivables DECIMAL(10,2),
	total_payables DECIMAL(10,2),
	total_sales_this_month DECIMAL(10,2),
	total_purchases_this_month DECIMAL(10,2)
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
			COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue,
			COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue') THEN total_amount ELSE 0 END), 0) as receivables,
			COALESCE(SUM(CASE 
				WHEN status = 'paid' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
				THEN total_amount 
				ELSE 0 
			END), 0) as sales_this_month
		FROM invoices
		WHERE user_id = current_user_id
	),
	purchase_metrics AS (
		SELECT 
			COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue') THEN total_amount ELSE 0 END), 0) as payables,
			COALESCE(SUM(CASE 
				WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
				THEN total_amount 
				ELSE 0 
			END), 0) as purchases_this_month
		FROM purchase_orders
		WHERE user_id = current_user_id
	)
	SELECT 
		sales_metrics.revenue,
		sales_metrics.receivables,
		purchase_metrics.payables,
		sales_metrics.sales_this_month,
		purchase_metrics.purchases_this_month
	FROM sales_metrics, purchase_metrics;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_financial_metrics() TO authenticated;