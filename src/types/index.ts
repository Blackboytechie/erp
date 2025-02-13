// Comprehensive type definitions for the ERP system

export interface BaseEntity {
	id: string;
	created_at?: string;
	updated_at?: string;
}

export interface Product extends BaseEntity {
	name: string;
	description?: string;
	sku: string;
	category_id?: string;
	category_name?: string;
	unit?: string;
	unit_price: number;
	stock_quantity: number;
	reorder_level?: number;
	alert_status?: 'normal' | 'below_reorder' | 'out_of_stock';
	price: number;
	stock: number;
	product_categories?: { name: string }[];
}

export interface Customer extends BaseEntity {
	name: string;
	email: string;
	phone?: string;
	address?: string;
	gst_number?: string;
	status?: 'active' | 'inactive';
}

export interface Supplier extends BaseEntity {
	name: string;
	email: string;
	phone: string;
	address: string;
	gst_number: string;
	payment_terms: number;
	status: 'active' | 'inactive';
	notes?: string;
}

export interface InvoiceItem {
	product_id: string;
	product_name: string;
	quantity: number;
	unit_price: number;
	total_price: number;
	gst_rate?: number;
}

export interface Invoice extends BaseEntity {
	invoice_number: string;
	customer_id: string;
	customer_name?: string;
	invoice_date: string;
	due_date: string;
	total_amount: number;
	total_tax_amount: number;
	total_discount_amount?: number;
	net_amount: number;
	status: 'draft' | 'sent' | 'paid' | 'overdue';
	items: InvoiceItem[];
	customers?: {
		name: string;
		email: string;
	};
	payment_status?: string;
	paid_amount?: number;
	gst_amount?: number;
}

export interface Bill extends BaseEntity {
	bill_number: string;
	supplier_id: string;
	purchase_order_id?: string | null;
	bill_date: string;
	due_date: string;
	total_amount: number;
	total_tax_amount: number;
	total_discount_amount?: number;
	net_amount: number;
	status: 'draft' | 'sent' | 'paid' | 'overdue';
	items: InvoiceItem[];
}

export interface PurchaseOrder extends BaseEntity {
	order_number: string;
	supplier_id: string;
	expected_delivery_date: string;
	total_amount: number;
	status: 'draft' | 'sent' | 'received' | 'cancelled';
	payment_status: 'pending' | 'partial' | 'paid';
	shipping_address: string;
	notes?: string;
	items: InvoiceItem[];
}

export interface Quotation extends BaseEntity {
	customer_name: string;
	valid_until: string;
	total_amount: number;
	status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
	items: InvoiceItem[];
}

export interface TrackingEvent extends BaseEntity {
	quotation_id: string;
	recipient_email: string;
	event_type: 'sent' | 'opened' | 'clicked' | 'downloaded';
	event_date: string;
	ip_address?: string | null;
	user_agent?: string | null;
}

export interface AgingReportData {
	receivables: {
		customer: string;
		total: number;
		current: number;
		days_1_30: number;
		days_31_60: number;
		days_61_90: number;
		days_over_90: number;
	}[];
	payables: {
		supplier: string;
		total: number;
		current: number;
		days_1_30: number;
		days_31_60: number;
		days_61_90: number;
		days_over_90: number;
	}[];
	summary: {
		total_receivables: number;
		total_payables: number;
		average_collection_period: number;
		average_payment_period: number;
	};
}

export interface FinancialMetrics {
	total_revenue: number;
	total_expenses: number;
	net_profit: number;
	profit_margin: number;
	revenue_growth_rate: number;
}

export interface ProfitLossReportData {
	total_revenue: number;
	total_expenses: number;
	net_profit: number;
	revenue_breakdown: {
		category: string;
		amount: number;
	}[];
	expense_breakdown: {
		category: string;
		amount: number;
	}[];
}

export interface CashFlowReportData {
	operating_activities: {
		category: string;
		items: { description: string; amount: number; }[];
		total: number;
	};
	investing_activities: {
		category: string;
		items: { description: string; amount: number; }[];
		total: number;
	};
	financing_activities: {
		category: string;
		items: { description: string; amount: number; }[];
		total: number;
	};
	net_cash_flow: number;
	beginning_cash: number;
	ending_cash: number;
}

export interface TaxReportData {
	gst_summary: {
		period: string;
		collected: number;
		paid: number;
		net_payable: number;
	}[];
	tax_liability: {
		type: string;
		amount: number;
		due_date: string;
		status: 'paid' | 'pending';
	}[];
	total_tax_liability?: number;
	total_tax_paid?: number;
}

export interface BalanceSheetData {
	assets: {
		category: string;
		items: { name: string; amount: number; }[];
		total: number;
	}[];
	liabilities: {
		category: string;
		items: { name: string; amount: number; }[];
		total: number;
	}[];
	equity: {
		category: string;
		items: { name: string; amount: number; }[];
		total: number;
	}[];
	total_assets: number;
	total_liabilities: number;
	total_equity: number;
}

// Utility type for filtering and sorting
export type SortOrder = 'asc' | 'desc';

export interface DataFilterOptions<T> {
	sortBy?: keyof T;
	sortOrder?: SortOrder;
	limit?: number;
	offset?: number;
	filters?: Partial<T>;
}