-- Create purchase_order_status_history table
CREATE TABLE IF NOT EXISTS public.purchase_order_status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    notes TEXT,
    user_id UUID REFERENCES auth.users(id)
);

-- Enable RLS for status history
ALTER TABLE public.purchase_order_status_history ENABLE ROW LEVEL SECURITY;

-- Create policy for status history
CREATE POLICY "Users can view their own purchase order status history"
    ON public.purchase_order_status_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.purchase_orders
            WHERE id = purchase_order_status_history.purchase_order_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own purchase order status history"
    ON public.purchase_order_status_history FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.purchase_orders
            WHERE id = purchase_order_status_history.purchase_order_id
            AND user_id = auth.uid()
        )
    );

-- Function to validate status transitions
CREATE OR REPLACE FUNCTION validate_purchase_order_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check if status is being updated
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Define valid transitions
    IF OLD.status = 'draft' AND NEW.status NOT IN ('sent', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition: draft can only be changed to sent or cancelled';
    ELSIF OLD.status = 'sent' AND NEW.status NOT IN ('received', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition: sent can only be changed to received or cancelled';
    ELSIF OLD.status IN ('received', 'cancelled') THEN
        RAISE EXCEPTION 'Cannot change status of a % order', OLD.status;
    END IF;

    -- Insert into status history
    INSERT INTO purchase_order_status_history (
        purchase_order_id,
        old_status,
        new_status,
        user_id
    ) VALUES (
        NEW.id,
        OLD.status,
        NEW.status,
        auth.uid()
    );

    -- If status is changed to received, update inventory
    IF NEW.status = 'received' THEN
        -- Create inventory transactions for each item
        INSERT INTO inventory_transactions (
            product_id,
            transaction_type,
            quantity,
            reference_type,
            reference_id,
            user_id
        )
        SELECT 
            product_id,
            'purchase',
            quantity,
            'purchase_order',
            NEW.id,
            auth.uid()
        FROM purchase_order_items
        WHERE purchase_order_id = NEW.id;

        -- Update product stock quantities
        UPDATE products p
        SET stock_quantity = p.stock_quantity + poi.quantity
        FROM purchase_order_items poi
        WHERE poi.purchase_order_id = NEW.id
        AND poi.product_id = p.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for status transitions
DROP TRIGGER IF EXISTS purchase_order_status_transition_trigger ON public.purchase_orders;
CREATE TRIGGER purchase_order_status_transition_trigger
    BEFORE UPDATE OF status ON public.purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION validate_purchase_order_status_transition();

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.purchase_order_status_history TO authenticated; 