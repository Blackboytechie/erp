import { Product, QuotationItem } from './index';

export interface Quotation {
  id: string;
  customer_name: string;
  valid_until: string;
  total_amount: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  created_at: string;
  items: QuotationItem[];
} 
