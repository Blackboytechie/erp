-- Drop existing function
DROP FUNCTION IF EXISTS public.get_profit_loss_report(TEXT);

-- Create updated function
CREATE OR REPLACE FUNCTION public.get_profit_loss_report(time_period TEXT)
RETURNS JSON
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
	RETURN json_build_object(
		'total_revenue', (
			SELECT COALESCE(SUM(invoices.total_amount), 0)
			FROM invoices
			WHERE invoices.status = 'paid'
			AND CASE 
				WHEN time_period = 'month' THEN DATE_TRUNC('month', invoices.created_at) = DATE_TRUNC('month', CURRENT_DATE)
				WHEN time_period = 'quarter' THEN DATE_TRUNC('quarter', invoices.created_at) = DATE_TRUNC('quarter', CURRENT_DATE)
				WHEN time_period = 'year' THEN DATE_TRUNC('year', invoices.created_at) = DATE_TRUNC('year', CURRENT_DATE)
			END
			AND invoices.user_id = auth.uid()
		),
		'total_expenses', (
			SELECT COALESCE(SUM(bills.total_amount), 0)
			FROM bills
			WHERE bills.status = 'paid'
			AND CASE 
				WHEN time_period = 'month' THEN DATE_TRUNC('month', bills.created_at) = DATE_TRUNC('month', CURRENT_DATE)
				WHEN time_period = 'quarter' THEN DATE_TRUNC('quarter', bills.created_at) = DATE_TRUNC('quarter', CURRENT_DATE)
				WHEN time_period = 'year' THEN DATE_TRUNC('year', bills.created_at) = DATE_TRUNC('year', CURRENT_DATE)
			END
			AND bills.user_id = auth.uid()
		),
		'revenue_breakdown', (
			WITH category_totals AS (
				SELECT 
					COALESCE(invoice_items.category, 'Uncategorized') as category,
					SUM(invoice_items.quantity * invoice_items.unit_price) as amount
				FROM invoices
				JOIN invoice_items ON invoices.id = invoice_items.invoice_id
				WHERE invoices.status = 'paid'
				AND CASE 
					WHEN time_period = 'month' THEN DATE_TRUNC('month', invoices.created_at) = DATE_TRUNC('month', CURRENT_DATE)
					WHEN time_period = 'quarter' THEN DATE_TRUNC('quarter', invoices.created_at) = DATE_TRUNC('quarter', CURRENT_DATE)
					WHEN time_period = 'year' THEN DATE_TRUNC('year', invoices.created_at) = DATE_TRUNC('year', CURRENT_DATE)
				END
				AND invoices.user_id = auth.uid()
				GROUP BY invoice_items.category
			)
			SELECT json_agg(json_build_object(
				'category', category,
				'amount', amount
			))
			FROM category_totals
		),
		'expense_breakdown', (
			WITH category_totals AS (
				SELECT 
					COALESCE(bill_items.category, 'Uncategorized') as category,
					SUM(bill_items.quantity * bill_items.unit_price) as amount
				FROM bills
				JOIN bill_items ON bills.id = bill_items.bill_id
				WHERE bills.status = 'paid'
				AND CASE 
					WHEN time_period = 'month' THEN DATE_TRUNC('month', bills.created_at) = DATE_TRUNC('month', CURRENT_DATE)
					WHEN time_period = 'quarter' THEN DATE_TRUNC('quarter', bills.created_at) = DATE_TRUNC('quarter', CURRENT_DATE)
					WHEN time_period = 'year' THEN DATE_TRUNC('year', bills.created_at) = DATE_TRUNC('year', CURRENT_DATE)
				END
				AND bills.user_id = auth.uid()
				GROUP BY bill_items.category
			)
			SELECT json_agg(json_build_object(
				'category', category,
				'amount', amount
			))
			FROM category_totals
		)
	);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_profit_loss_report(TEXT) TO authenticated;