-- Create function to get aging reports
CREATE OR REPLACE FUNCTION public.get_aging_reports()
RETURNS JSON
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
	RETURN json_build_object(
		'receivables', (
			WITH customer_aging AS (
				SELECT 
					c.name,
					COALESCE(SUM(i.net_amount), 0) as total,
					COALESCE(SUM(CASE WHEN (CURRENT_DATE - i.due_date) <= 0 THEN i.net_amount ELSE 0 END), 0) as current,
					COALESCE(SUM(CASE WHEN (CURRENT_DATE - i.due_date) BETWEEN 1 AND 30 THEN i.net_amount ELSE 0 END), 0) as days_1_30,
					COALESCE(SUM(CASE WHEN (CURRENT_DATE - i.due_date) BETWEEN 31 AND 60 THEN i.net_amount ELSE 0 END), 0) as days_31_60,
					COALESCE(SUM(CASE WHEN (CURRENT_DATE - i.due_date) BETWEEN 61 AND 90 THEN i.net_amount ELSE 0 END), 0) as days_61_90,
					COALESCE(SUM(CASE WHEN (CURRENT_DATE - i.due_date) > 90 THEN i.net_amount ELSE 0 END), 0) as days_over_90
				FROM customers c
				LEFT JOIN invoices i ON c.id = i.customer_id
				WHERE i.status != 'paid'
				AND i.user_id = auth.uid()
				GROUP BY c.id, c.name
			)
			SELECT json_agg(json_build_object(
				'customer', name,
				'total', total,
				'current', current,
				'days_1_30', days_1_30,
				'days_31_60', days_31_60,
				'days_61_90', days_61_90,
				'days_over_90', days_over_90
			))
			FROM customer_aging
		),
		'payables', (
			WITH supplier_aging AS (
				SELECT 
					s.name,
					COALESCE(SUM(b.net_amount), 0) as total,
					COALESCE(SUM(CASE WHEN (CURRENT_DATE - b.due_date) <= 0 THEN b.net_amount ELSE 0 END), 0) as current,
					COALESCE(SUM(CASE WHEN (CURRENT_DATE - b.due_date) BETWEEN 1 AND 30 THEN b.net_amount ELSE 0 END), 0) as days_1_30,
					COALESCE(SUM(CASE WHEN (CURRENT_DATE - b.due_date) BETWEEN 31 AND 60 THEN b.net_amount ELSE 0 END), 0) as days_31_60,
					COALESCE(SUM(CASE WHEN (CURRENT_DATE - b.due_date) BETWEEN 61 AND 90 THEN b.net_amount ELSE 0 END), 0) as days_61_90,
					COALESCE(SUM(CASE WHEN (CURRENT_DATE - b.due_date) > 90 THEN b.net_amount ELSE 0 END), 0) as days_over_90
				FROM suppliers s
				LEFT JOIN bills b ON s.id = b.supplier_id
				WHERE b.status != 'paid'
				AND b.user_id = auth.uid()
				GROUP BY s.id, s.name
			)
			SELECT json_agg(json_build_object(
				'supplier', name,
				'total', total,
				'current', current,
				'days_1_30', days_1_30,
				'days_31_60', days_31_60,
				'days_61_90', days_61_90,
				'days_over_90', days_over_90
			))
			FROM supplier_aging
		),
		'summary', (
			SELECT json_build_object(
				'total_receivables', COALESCE((
					SELECT SUM(net_amount)
					FROM invoices
					WHERE status != 'paid'
					AND user_id = auth.uid()
				), 0),
				'total_payables', COALESCE((
					SELECT SUM(net_amount)
					FROM bills
					WHERE status != 'paid'
					AND user_id = auth.uid()
				), 0),
				'average_collection_period', COALESCE((
					SELECT AVG(payment_date - invoice_date)::INTEGER
					FROM invoice_payments ip
					JOIN invoices i ON i.id = ip.invoice_id
					WHERE i.user_id = auth.uid()
				), 0),
				'average_payment_period', COALESCE((
					SELECT AVG(payment_date - bill_date)::INTEGER
					FROM bill_payments bp
					JOIN bills b ON b.id = bp.bill_id
					WHERE b.user_id = auth.uid()
				), 0)
			)
		)
	);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_aging_reports() TO authenticated;