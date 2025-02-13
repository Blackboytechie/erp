-- Add unit column to products table
ALTER TABLE public.products
ADD COLUMN unit text;

-- Update existing rows to have a default value
UPDATE public.products
SET unit = 'pcs'
WHERE unit IS NULL;

-- Make unit column not nullable after setting default values
ALTER TABLE public.products
ALTER COLUMN unit SET NOT NULL;