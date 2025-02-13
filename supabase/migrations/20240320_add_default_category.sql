-- Enable RLS on product_categories table if not already enabled
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own product categories" ON public.product_categories;
DROP POLICY IF EXISTS "Users can insert their own product categories" ON public.product_categories;
DROP POLICY IF EXISTS "Users can update their own product categories" ON public.product_categories;
DROP POLICY IF EXISTS "Users can view shared categories" ON public.product_categories;

-- Create policies
CREATE POLICY "Users can view their own product categories"
    ON public.product_categories FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own product categories"
    ON public.product_categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product categories"
    ON public.product_categories FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Insert or update default category to be accessible by all users
INSERT INTO public.product_categories (id, name, description, user_id)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Uncategorized',
    'Default category for uncategorized products',
    NULL
)
ON CONFLICT (id) DO UPDATE 
SET user_id = NULL;

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.product_categories TO authenticated; 