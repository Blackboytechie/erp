# Distribution ERP System

A comprehensive ERP (Enterprise Resource Planning) system built for distribution businesses. The system helps manage inventory, suppliers, sales, quotations, and invoicing with GST compliance.

## Tech Stack

- **Frontend:**
  - Vite.js + React
  - TypeScript
  - Tailwind CSS
  - Framer Motion
  - React Query
  - Zustand (State Management)

- **Backend:**
  - Supabase (PostgreSQL)
  - Authentication
  - Row Level Security
  - Realtime Updates

## Features

- **User Authentication & Role Management**
  - Secure login/signup using Supabase Auth
  - Role-based access control
  - Multi-user support

- **Product & Inventory Management**
  - Add, update, and categorize products
  - Real-time stock tracking
  - Low stock alerts
  - Warehouse management

- **Supplier Management**
  - Supplier database
  - Contact information
  - Order history

- **Sales & Distribution**
  - Create and track sales orders
  - Customer database
  - Payment tracking
  - Delivery status monitoring

- **Quotation Management**
  - Create professional quotations
  - Convert to invoices
  - PDF export

- **Invoicing & GST**
  - GST-compliant invoicing
  - Automatic tax calculations
  - Payment tracking
  - PDF generation

- **Reports & Analytics**
  - Sales reports
  - Inventory reports
  - Financial statements
  - Performance analytics

## Getting Started

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd erp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Initialize the database:
   - Create a new Supabase project
   - Run the SQL commands from `schema.sql` in the Supabase SQL editor

5. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── components/        # Reusable UI components
├── pages/            # Page components
├── layouts/          # Layout components
├── hooks/            # Custom React hooks
├── utils/            # Utility functions
├── services/         # API services
├── store/            # State management
├── types/            # TypeScript types
├── assets/           # Static assets
└── styles/           # Global styles
```

## Database Schema

The system uses the following main tables:

- `products`: Product information and stock levels
- `suppliers`: Supplier details and contact information
- `sales`: Sales order information
- `sale_items`: Individual items in sales orders
- `purchase_orders`: Purchase orders to suppliers
- `purchase_order_items`: Items in purchase orders
- `quotations`: Customer quotations
- `quotation_items`: Items in quotations
- `invoices`: Customer invoices
- `invoice_items`: Items in invoices
- `payments`: Payment records

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
