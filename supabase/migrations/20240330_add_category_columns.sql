-- Add category column to invoice_items
ALTER TABLE public.invoice_items
ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Add category column to bill_items
ALTER TABLE public.bill_items
ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Update existing invoice_items to set category from products
UPDATE public.invoice_items ii
SET category = p.category_id::text
FROM public.products p
WHERE ii.product_id = p.id;

-- Update existing bill_items to set category from products
UPDATE public.bill_items bi
SET category = p.category_id::text
FROM public.products p
WHERE bi.product_id = p.id;