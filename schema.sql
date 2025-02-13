-- Enable RLS (Row Level Security)
alter table public.users enable row level security;

-- Create products table
create table public.products (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    sku text not null unique,
    category text not null,
    price decimal(10,2) not null check (price >= 0),
    stock integer not null default 0 check (stock >= 0),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create suppliers table
create table public.suppliers (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    contact_person text not null,
    email text not null,
    phone text not null,
    address text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create sales table
create table public.sales (
    id uuid default gen_random_uuid() primary key,
    customer_name text not null,
    order_date date not null,
    total_amount decimal(10,2) not null check (total_amount >= 0),
    payment_status text not null check (payment_status in ('pending', 'paid', 'overdue')),
    delivery_status text not null check (delivery_status in ('pending', 'shipped', 'delivered')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create sale_items table
create table public.sale_items (
    id uuid default gen_random_uuid() primary key,
    sale_id uuid not null references public.sales(id) on delete cascade,
    product_id uuid not null references public.products(id),
    quantity integer not null check (quantity > 0),
    price decimal(10,2) not null check (price >= 0),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create purchase_orders table
create table public.purchase_orders (
    id uuid default gen_random_uuid() primary key,
    supplier_id uuid not null references public.suppliers(id),
    order_date date not null,
    total_amount decimal(10,2) not null check (total_amount >= 0),
    status text not null check (status in ('draft', 'ordered', 'received', 'cancelled')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create purchase_order_items table
create table public.purchase_order_items (
    id uuid default gen_random_uuid() primary key,
    purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
    product_id uuid not null references public.products(id),
    quantity integer not null check (quantity > 0),
    price decimal(10,2) not null check (price >= 0),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create quotations table
create table public.quotations (
    id uuid default gen_random_uuid() primary key,
    customer_name text not null,
    valid_until date not null,
    total_amount decimal(10,2) not null check (total_amount >= 0),
    status text not null check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create quotation_items table
create table public.quotation_items (
    id uuid default gen_random_uuid() primary key,
    quotation_id uuid not null references public.quotations(id) on delete cascade,
    product_id uuid not null references public.products(id),
    quantity integer not null check (quantity > 0),
    price decimal(10,2) not null check (price >= 0),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create invoices table
create table public.invoices (
    id uuid default gen_random_uuid() primary key,
    sale_id uuid references public.sales(id),
    invoice_number text not null unique,
    invoice_date date not null,
    due_date date not null,
    total_amount decimal(10,2) not null check (total_amount >= 0),
    tax_amount decimal(10,2) not null check (tax_amount >= 0),
    status text not null check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create invoice_items table
create table public.invoice_items (
    id uuid default gen_random_uuid() primary key,
    invoice_id uuid not null references public.invoices(id) on delete cascade,
    product_id uuid not null references public.products(id),
    quantity integer not null check (quantity > 0),
    price decimal(10,2) not null check (price >= 0),
    tax_rate decimal(5,2) not null check (tax_rate >= 0),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create payments table
create table public.payments (
    id uuid default gen_random_uuid() primary key,
    invoice_id uuid not null references public.invoices(id),
    amount decimal(10,2) not null check (amount > 0),
    payment_date date not null,
    payment_method text not null check (payment_method in ('cash', 'bank_transfer', 'cheque', 'upi')),
    reference_number text,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create email_tracking table
create table public.email_tracking (
    id uuid default gen_random_uuid() primary key,
    quotation_id uuid references public.quotations(id),
    recipient_email text not null,
    event_type text not null check (event_type in ('sent', 'opened', 'clicked', 'downloaded')),
    event_date timestamp with time zone default timezone('utc'::text, now()) not null,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create pdf_templates table
create table public.pdf_templates (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    description text,
    header_text text,
    footer_text text,
    terms_conditions text[],
    company_details jsonb,
    colors jsonb,
    logo_url text,
    is_default boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create functions for updating timestamps
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

-- Create triggers for updating timestamps
create trigger handle_products_updated_at
    before update on public.products
    for each row
    execute function public.handle_updated_at();

create trigger handle_suppliers_updated_at
    before update on public.suppliers
    for each row
    execute function public.handle_updated_at();

create trigger handle_sales_updated_at
    before update on public.sales
    for each row
    execute function public.handle_updated_at();

create trigger handle_purchase_orders_updated_at
    before update on public.purchase_orders
    for each row
    execute function public.handle_updated_at();

create trigger handle_quotations_updated_at
    before update on public.quotations
    for each row
    execute function public.handle_updated_at();

create trigger handle_invoices_updated_at
    before update on public.invoices
    for each row
    execute function public.handle_updated_at();

-- Add trigger for pdf_templates
create trigger handle_pdf_templates_updated_at
    before update on public.pdf_templates
    for each row
    execute function public.handle_updated_at();

-- Enable RLS for all tables
alter table public.products enable row level security;
alter table public.suppliers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.email_tracking enable row level security;
alter table public.pdf_templates enable row level security;

-- Create RLS policies
create policy "Enable read access for authenticated users"
    on public.products for select
    to authenticated
    using (true);

create policy "Enable write access for authenticated users"
    on public.products for insert
    to authenticated
    with check (true);

create policy "Enable update access for authenticated users"
    on public.products for update
    to authenticated
    using (true);

create policy "Enable delete access for authenticated users"
    on public.products for delete
    to authenticated
    using (true);

-- Repeat similar policies for other tables
create policy "Enable read access for authenticated users"
    on public.suppliers for select
    to authenticated
    using (true);

create policy "Enable write access for authenticated users"
    on public.suppliers for insert
    to authenticated
    with check (true);

create policy "Enable update access for authenticated users"
    on public.suppliers for update
    to authenticated
    using (true);

create policy "Enable delete access for authenticated users"
    on public.suppliers for delete
    to authenticated
    using (true);

-- Add indexes for better performance
create index products_name_idx on public.products using gin (to_tsvector('english', name));
create index products_sku_idx on public.products (sku);
create index products_category_idx on public.products (category);
create index suppliers_name_idx on public.suppliers using gin (to_tsvector('english', name));
create index suppliers_email_idx on public.suppliers (email);
create index sales_customer_name_idx on public.sales using gin (to_tsvector('english', customer_name));
create index sales_order_date_idx on public.sales (order_date);
create index sales_payment_status_idx on public.sales (payment_status);
create index sales_delivery_status_idx on public.sales (delivery_status);
create index invoices_invoice_number_idx on public.invoices (invoice_number);
create index invoices_invoice_date_idx on public.invoices (invoice_date);
create index invoices_due_date_idx on public.invoices (due_date);
create index invoices_status_idx on public.invoices (status);

-- Add index for email tracking
create index email_tracking_quotation_id_idx on public.email_tracking(quotation_id);
create index email_tracking_recipient_email_idx on public.email_tracking(recipient_email);
create index email_tracking_event_type_idx on public.email_tracking(event_type);

-- Create RLS policies for email tracking
create policy "Enable read access for authenticated users"
    on public.email_tracking for select
    to authenticated
    using (true);

create policy "Enable write access for authenticated users"
    on public.email_tracking for insert
    to authenticated
    with check (true);

-- Create RLS policies for pdf_templates
create policy "Enable read access for authenticated users"
    on public.pdf_templates for select
    to authenticated
    using (true);

create policy "Enable write access for authenticated users"
    on public.pdf_templates for insert
    to authenticated
    with check (true);

create policy "Enable update access for authenticated users"
    on public.pdf_templates for update
    to authenticated
    using (true);

create policy "Enable delete access for authenticated users"
    on public.pdf_templates for delete
    to authenticated
    using (true); 