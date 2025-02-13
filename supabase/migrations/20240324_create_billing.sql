-- Create bills table
CREATE TABLE IF NOT EXISTS public.bills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    bill_number TEXT UNIQUE NOT NULL,
    bill_date DATE NOT NULL,
    due_date DATE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id),
    purchase_order_id UUID REFERENCES public.purchase_orders(id),
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    net_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    notes TEXT,
    user_id UUID REFERENCES auth.users(id)
);

-- Create bill items table
CREATE TABLE IF NOT EXISTS public.bill_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    description TEXT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL
);

-- Create bill payments table
CREATE TABLE IF NOT EXISTS public.bill_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference_number TEXT,
    notes TEXT,
    user_id UUID REFERENCES auth.users(id)
);

-- Function to generate bill number
CREATE OR REPLACE FUNCTION generate_bill_number()
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
    SELECT COALESCE(MAX(SUBSTRING(bill_number FROM 'BILL-\d{4}-(\d+)')::INTEGER), 0) + 1
    INTO next_number
    FROM bills
    WHERE bill_number LIKE 'BILL-' || year_prefix || '-%';
    
    -- Format: BILL-YYYY-XXXX (e.g., BILL-2024-0001)
    NEW.bill_number := 'BILL-' || year_prefix || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN NEW;
END;
$$;

-- Create trigger for bill number generation
CREATE TRIGGER generate_bill_number_trigger
    BEFORE INSERT ON public.bills
    FOR EACH ROW
    EXECUTE FUNCTION generate_bill_number();

-- Enable RLS
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for bills
CREATE POLICY "Users can view their own bills"
    ON public.bills FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bills"
    ON public.bills FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bills"
    ON public.bills FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bills"
    ON public.bills FOR DELETE
    USING (auth.uid() = user_id);

-- Create policies for bill items
CREATE POLICY "Users can view their own bill items"
    ON public.bill_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.bills
            WHERE id = bill_items.bill_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own bill items"
    ON public.bill_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bills
            WHERE id = bill_items.bill_id
            AND user_id = auth.uid()
        )
    );

-- Create policies for bill payments
CREATE POLICY "Users can view their own bill payments"
    ON public.bill_payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.bills
            WHERE id = bill_payments.bill_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own bill payments"
    ON public.bill_payments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bills
            WHERE id = bill_payments.bill_id
            AND user_id = auth.uid()
        )
    );

-- Function to update bill payment status
CREATE OR REPLACE FUNCTION update_bill_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    total_paid DECIMAL(10,2);
    bill_total DECIMAL(10,2);
BEGIN
    -- Get total paid amount
    SELECT COALESCE(SUM(amount), 0)
    INTO total_paid
    FROM bill_payments
    WHERE bill_id = NEW.bill_id;

    -- Get bill total amount
    SELECT net_amount
    INTO bill_total
    FROM bills
    WHERE id = NEW.bill_id;

    -- Update payment status
    UPDATE bills
    SET 
        payment_status = CASE
            WHEN total_paid >= bill_total THEN 'paid'
            WHEN total_paid > 0 THEN 'partial'
            ELSE 'unpaid'
        END,
        updated_at = NOW()
    WHERE id = NEW.bill_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for payment status updates
CREATE TRIGGER bill_payment_status_trigger
    AFTER INSERT OR UPDATE ON public.bill_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_payment_status();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills TO authenticated;
GRANT SELECT, INSERT ON public.bill_items TO authenticated;
GRANT SELECT, INSERT ON public.bill_payments TO authenticated; 