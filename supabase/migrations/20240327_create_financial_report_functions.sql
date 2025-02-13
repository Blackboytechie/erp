-- Drop existing functions first
DROP FUNCTION IF EXISTS public.get_profit_loss_report(TEXT);
DROP FUNCTION IF EXISTS public.get_balance_sheet(DATE);
DROP FUNCTION IF EXISTS public.get_cash_flow_statement(TEXT);
DROP FUNCTION IF EXISTS public.get_tax_reports(TEXT);

-- Function to get profit and loss report
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
		),
		'revenue_breakdown', (
			SELECT json_agg(json_build_object(
				'category', category,
				'amount', total_amount
			))
			FROM (
				SELECT invoice_items.category, SUM(invoices.total_amount) as total_amount
				FROM invoices
				JOIN invoice_items ON invoices.id = invoice_items.invoice_id
				WHERE invoices.status = 'paid'
				AND CASE 
					WHEN time_period = 'month' THEN DATE_TRUNC('month', invoices.created_at) = DATE_TRUNC('month', CURRENT_DATE)
					WHEN time_period = 'quarter' THEN DATE_TRUNC('quarter', invoices.created_at) = DATE_TRUNC('quarter', CURRENT_DATE)
					WHEN time_period = 'year' THEN DATE_TRUNC('year', invoices.created_at) = DATE_TRUNC('year', CURRENT_DATE)
				END
				GROUP BY invoice_items.category
			) t
		),
		'expense_breakdown', (
			SELECT json_agg(json_build_object(
				'category', category,
				'amount', total_amount
			))
			FROM (
				SELECT bill_items.category, SUM(bills.total_amount) as total_amount
				FROM bills
				JOIN bill_items ON bills.id = bill_items.bill_id
				WHERE bills.status = 'paid'
				AND CASE 
					WHEN time_period = 'month' THEN DATE_TRUNC('month', bills.created_at) = DATE_TRUNC('month', CURRENT_DATE)
					WHEN time_period = 'quarter' THEN DATE_TRUNC('quarter', bills.created_at) = DATE_TRUNC('quarter', CURRENT_DATE)
					WHEN time_period = 'year' THEN DATE_TRUNC('year', bills.created_at) = DATE_TRUNC('year', CURRENT_DATE)
				END
				GROUP BY bill_items.category
			) t
		)
	);
END;
$$;

-- Function to get balance sheet
CREATE OR REPLACE FUNCTION public.get_balance_sheet(as_of_date DATE)
RETURNS JSON
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
	RETURN json_build_object(
		'assets', (
			SELECT json_agg(json_build_object(
				'category', category,
				'items', items,
				'total', total
			))
			FROM (
				SELECT 
					a.category,
					json_agg(json_build_object('name', a.name, 'amount', a.amount)) as items,
					SUM(a.amount) as total
				FROM assets a
				WHERE a.date <= as_of_date
				GROUP BY a.category
			) t
		),
		'liabilities', (
			SELECT json_agg(json_build_object(
				'category', category,
				'items', items,
				'total', total
			))
			FROM (
				SELECT 
					l.category,
					json_agg(json_build_object('name', l.name, 'amount', l.amount)) as items,
					SUM(l.amount) as total
				FROM liabilities l
				WHERE l.date <= as_of_date
				GROUP BY l.category
			) t
		),
		'equity', (
			SELECT json_agg(json_build_object(
				'category', category,
				'items', items,
				'total', total
			))
			FROM (
				SELECT 
					e.category,
					json_agg(json_build_object('name', e.name, 'amount', e.amount)) as items,
					SUM(e.amount) as total
				FROM equity e
				WHERE e.date <= as_of_date
				GROUP BY e.category
			) t
		)
	);
END;
$$;

-- Function to get cash flow statement
CREATE OR REPLACE FUNCTION public.get_cash_flow_statement(time_period TEXT)
RETURNS JSON
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
	RETURN json_build_object(
		'operating_activities', (
			WITH activity_items AS (
				SELECT description, amount
				FROM cash_flow_items
				WHERE type = 'operating'
				AND user_id = auth.uid()
				AND CASE 
					WHEN time_period = 'month' THEN DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
					WHEN time_period = 'quarter' THEN DATE_TRUNC('quarter', date) = DATE_TRUNC('quarter', CURRENT_DATE)
					WHEN time_period = 'year' THEN DATE_TRUNC('year', date) = DATE_TRUNC('year', CURRENT_DATE)
				END
			)
			SELECT json_build_object(
				'category', 'Operating Activities',
				'items', (SELECT json_agg(json_build_object('description', description, 'amount', amount)) FROM activity_items),
				'total', (SELECT COALESCE(SUM(amount), 0) FROM activity_items)
			)
		),
		'investing_activities', (
			WITH activity_items AS (
				SELECT description, amount
				FROM cash_flow_items
				WHERE type = 'investing'
				AND user_id = auth.uid()
				AND CASE 
					WHEN time_period = 'month' THEN DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
					WHEN time_period = 'quarter' THEN DATE_TRUNC('quarter', date) = DATE_TRUNC('quarter', CURRENT_DATE)
					WHEN time_period = 'year' THEN DATE_TRUNC('year', date) = DATE_TRUNC('year', CURRENT_DATE)
				END
			)
			SELECT json_build_object(
				'category', 'Investing Activities',
				'items', (SELECT json_agg(json_build_object('description', description, 'amount', amount)) FROM activity_items),
				'total', (SELECT COALESCE(SUM(amount), 0) FROM activity_items)
			)
		),
		'financing_activities', (
			WITH activity_items AS (
				SELECT description, amount
				FROM cash_flow_items
				WHERE type = 'financing'
				AND user_id = auth.uid()
				AND CASE 
					WHEN time_period = 'month' THEN DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
					WHEN time_period = 'quarter' THEN DATE_TRUNC('quarter', date) = DATE_TRUNC('quarter', CURRENT_DATE)
					WHEN time_period = 'year' THEN DATE_TRUNC('year', date) = DATE_TRUNC('year', CURRENT_DATE)
				END
			)
			SELECT json_build_object(
				'category', 'Financing Activities',
				'items', (SELECT json_agg(json_build_object('description', description, 'amount', amount)) FROM activity_items),
				'total', (SELECT COALESCE(SUM(amount), 0) FROM activity_items)
			)
		),
		'net_cash_flow', (
			SELECT COALESCE(
				(SELECT SUM(amount) FROM cash_flow_items WHERE user_id = auth.uid() AND 
					CASE 
						WHEN time_period = 'month' THEN DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
						WHEN time_period = 'quarter' THEN DATE_TRUNC('quarter', date) = DATE_TRUNC('quarter', CURRENT_DATE)
						WHEN time_period = 'year' THEN DATE_TRUNC('year', date) = DATE_TRUNC('year', CURRENT_DATE)
					END
				), 0)
		),
		'beginning_cash', (
			SELECT COALESCE(
				(SELECT SUM(amount) FROM cash_flow_items WHERE user_id = auth.uid() AND 
					date < CASE 
						WHEN time_period = 'month' THEN DATE_TRUNC('month', CURRENT_DATE)
						WHEN time_period = 'quarter' THEN DATE_TRUNC('quarter', CURRENT_DATE)
						WHEN time_period = 'year' THEN DATE_TRUNC('year', CURRENT_DATE)
					END
				), 0)
		),
		'ending_cash', (
			SELECT COALESCE(
				(SELECT SUM(amount) FROM cash_flow_items WHERE user_id = auth.uid() AND 
					date <= CASE 
						WHEN time_period = 'month' THEN DATE_TRUNC('month', CURRENT_DATE)
						WHEN time_period = 'quarter' THEN DATE_TRUNC('quarter', CURRENT_DATE)
						WHEN time_period = 'year' THEN DATE_TRUNC('year', CURRENT_DATE)
					END
				), 0)
		)
	);
END;
$$;

-- Function to get tax reports
CREATE OR REPLACE FUNCTION public.get_tax_reports(report_period TEXT)
RETURNS JSON
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
	RETURN json_build_object(
		'gst_summary', (
			WITH gst_summary_data AS (
				SELECT 
					to_char(date_trunc('month', created_at), 'Month YYYY') as period,
					COALESCE(SUM(total_tax_amount), 0) as collected,
					COALESCE(SUM(CASE WHEN status = 'paid' THEN total_tax_amount ELSE 0 END), 0) as paid,
					COALESCE(SUM(CASE WHEN status != 'paid' THEN total_tax_amount ELSE 0 END), 0) as net_payable
				FROM invoices
				WHERE CASE 
					WHEN report_period = 'current' THEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
					WHEN report_period = 'previous' THEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
					WHEN report_period = 'year' THEN DATE_TRUNC('year', created_at) = DATE_TRUNC('year', CURRENT_DATE)
				END
				AND user_id = auth.uid()
				GROUP BY DATE_TRUNC('month', created_at)
			)
			SELECT json_agg(
				json_build_object(
					'period', period,
					'collected', collected,
					'paid', paid,
					'net_payable', net_payable
				)
			)
			FROM gst_summary_data
		),
		'tax_liability', (
			WITH tax_liability_data AS (
				SELECT 
					tax_type,
					amount,
					due_date,
					status
				FROM tax_liabilities
				WHERE CASE 
					WHEN report_period = 'current' THEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
					WHEN report_period = 'previous' THEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
					WHEN report_period = 'year' THEN DATE_TRUNC('year', created_at) = DATE_TRUNC('year', CURRENT_DATE)
				END
				AND user_id = auth.uid()
			)
			SELECT json_agg(
				json_build_object(
					'type', tax_type,
					'amount', amount,
					'due_date', due_date,
					'status', status
				)
			)
			FROM tax_liability_data
		)
	);
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_profit_loss_report(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_balance_sheet(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cash_flow_statement(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tax_reports(TEXT) TO authenticated;
