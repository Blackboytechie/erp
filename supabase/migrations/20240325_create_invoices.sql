-- Drop existing table if it exists
DROP TABLE IF EXISTS public.invoices CASCADE;

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    customer_id UUID REFERENCES public.customers(id),
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    net_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    notes TEXT,
    user_id UUID REFERENCES auth.users(id)
);

-- Create invoice items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    description TEXT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL
);

-- Create invoice payments table
CREATE TABLE IF NOT EXISTS public.invoice_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference_number TEXT,
    notes TEXT,
    user_id UUID REFERENCES auth.users(id)
);

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    year_prefix TEXT;
    next_number INTEGER;
BEGIN
    -- Get the current year as prefix
    year_prefix := to_char(CURRENT_DATE, 'YYYY');
    
    -- Get the next number for this year
    SELECT COALESCE(MAX(SUBSTRING(invoice_number FROM 'INV-\d{4}-(\d+)')::INTEGER), 0) + 1
    INTO next_number
    FROM invoices
    WHERE invoice_number LIKE 'INV-' || year_prefix || '-%';
    
    -- Format: INV-YYYY-XXXX (e.g., INV-2024-0001)
    NEW.invoice_number := 'INV-' || year_prefix || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN NEW;
END;
$$;

-- Create trigger for invoice number generation
CREATE TRIGGER generate_invoice_number_trigger
    BEFORE INSERT ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION generate_invoice_number();

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for invoices
CREATE POLICY "Users can view their own invoices"
    ON public.invoices FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices"
    ON public.invoices FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
    ON public.invoices FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices"
    ON public.invoices FOR DELETE
    USING (auth.uid() = user_id);

-- Create policies for invoice items
CREATE POLICY "Users can view their own invoice items"
    ON public.invoice_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.invoices
            WHERE id = invoice_items.invoice_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own invoice items"
    ON public.invoice_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.invoices
            WHERE id = invoice_items.invoice_id
            AND user_id = auth.uid()
        )
    );

-- Create policies for invoice payments
CREATE POLICY "Users can view their own invoice payments"
    ON public.invoice_payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.invoices
            WHERE id = invoice_payments.invoice_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own invoice payments"
    ON public.invoice_payments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.invoices
            WHERE id = invoice_payments.invoice_id
            AND user_id = auth.uid()
        )
    );

-- Function to update invoice payment status
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    total_paid DECIMAL(10,2);
    invoice_total DECIMAL(10,2);
BEGIN
    -- Get total paid amount
    SELECT COALESCE(SUM(amount), 0)
    INTO total_paid
    FROM invoice_payments
    WHERE invoice_id = NEW.invoice_id;

    -- Get invoice total amount
    SELECT net_amount
    INTO invoice_total
    FROM invoices
    WHERE id = NEW.invoice_id;

    -- Update payment status
    UPDATE invoices
    SET 
        payment_status = CASE
            WHEN total_paid >= invoice_total THEN 'paid'
            WHEN total_paid > 0 THEN 'partial'
            ELSE 'unpaid'
        END,
        updated_at = NOW()
    WHERE id = NEW.invoice_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for payment status updates
CREATE TRIGGER invoice_payment_status_trigger
    AFTER INSERT OR UPDATE ON public.invoice_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_status();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON public.invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON public.invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON public.invoice_payments(invoice_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT ON public.invoice_items TO authenticated;
GRANT SELECT, INSERT ON public.invoice_payments TO authenticated;

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_payment_stats();

-- Create function to get payment statistics
CREATE OR REPLACE FUNCTION get_payment_stats()
RETURNS TABLE (
    payment_method TEXT,
    payment_count BIGINT,
    total_amount DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ip.payment_method::TEXT,
        COUNT(*)::BIGINT as payment_count,
        COALESCE(SUM(ip.amount), 0)::DECIMAL(10,2) as total_amount
    FROM invoice_payments ip
    WHERE EXISTS (
        SELECT 1 FROM invoices i 
        WHERE i.id = ip.invoice_id 
        AND i.user_id = auth.uid()
    )
    GROUP BY ip.payment_method
    ORDER BY ip.payment_method;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_payment_stats() TO authenticated;

-- Create function to get bill payment statistics
CREATE OR REPLACE FUNCTION get_bill_payment_stats()
RETURNS TABLE (
  payment_method TEXT,
  payment_count BIGINT,
  total_amount NUMERIC
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.payment_method::TEXT,
    COUNT(*)::BIGINT as payment_count,
    COALESCE(SUM(bp.amount), 0)::NUMERIC as total_amount
  FROM bill_payments bp
  JOIN bills b ON b.id = bp.bill_id
  WHERE b.user_id = auth.uid()
  GROUP BY bp.payment_method
  ORDER BY total_amount DESC;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_bill_payment_stats() TO authenticated; 