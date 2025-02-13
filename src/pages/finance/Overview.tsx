import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { IoWallet, IoTrendingUp, IoTrendingDown, IoCart, IoWarning, IoReceiptOutline, IoDocumentText } from 'react-icons/io5';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import toast from 'react-hot-toast';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface FinancialMetrics {
  // Distribution metrics
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  pending_orders: number;
  low_stock_items: number;
  // Financial metrics
  total_receivables: number;
  total_payables: number;
  total_sales_this_month: number;
  total_purchases_this_month: number;
}

interface PaymentStats {
  payment_method: string;
  payment_count: number;
  total_amount: number;
}

export default function Overview() {
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    total_revenue: 0,
    total_orders: 0,
    average_order_value: 0,
    pending_orders: 0,
    low_stock_items: 0,
    total_receivables: 0,
    total_payables: 0,
    total_sales_this_month: 0,
    total_purchases_this_month: 0,
  });
  const [invoicePayments, setInvoicePayments] = useState<PaymentStats[]>([]);
  const [billPayments, setBillPayments] = useState<PaymentStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch distribution metrics
      const { data: distributionData, error: distributionError } = await supabase
        .rpc('get_distribution_metrics');

      if (distributionError) throw distributionError;

      // Fetch financial metrics
      const { data: financialData, error: financialError } = await supabase
        .rpc('get_financial_metrics');

      if (financialError) throw financialError;

      setMetrics({
        ...distributionData[0],
        ...financialData[0]
      });

      // Fetch invoice payment stats
      const { data: invoicePaymentData, error: invoicePaymentError } = await supabase
        .rpc('get_payment_stats');

      if (invoicePaymentError) throw invoicePaymentError;
      setInvoicePayments(invoicePaymentData);

      // Fetch bill payment stats
      const { data: billPaymentData, error: billPaymentError } = await supabase
        .rpc('get_bill_payment_stats');

      if (billPaymentError) throw billPaymentError;
      setBillPayments(billPaymentData);
    } catch (error) {
      console.error('Error fetching financial data:', error);
      toast.error('Failed to fetch financial data');
    } finally {
      setLoading(false);
    }
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: 'Monthly Overview',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(this: any, value: number | string) {
            if (typeof value === 'number') {
              return `₹${value.toLocaleString()}`;
            }
            return value;
          }
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
            <IoTrendingUp className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
              <dd className="text-2xl font-semibold text-gray-900">₹{metrics.total_revenue.toLocaleString()}</dd>
            </dl>
            </div>
          </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
            <IoCart className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
              <dd className="text-2xl font-semibold text-gray-900">{metrics.total_orders}</dd>
            </dl>
            </div>
          </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
            <IoWallet className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Average Order Value</dt>
              <dd className="text-2xl font-semibold text-gray-900">₹{metrics.average_order_value.toLocaleString()}</dd>
            </dl>
            </div>
          </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
            <IoWarning className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Low Stock Items</dt>
              <dd className="text-2xl font-semibold text-gray-900">{metrics.low_stock_items}</dd>
            </dl>
            </div>
          </div>
          </div>
        </div>
        </div>

        {/* Additional Financial Metrics */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
            <IoReceiptOutline className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Total Receivables</dt>
              <dd className="text-2xl font-semibold text-gray-900">₹{metrics.total_receivables.toLocaleString()}</dd>
            </dl>
            </div>
          </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
            <IoDocumentText className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Total Payables</dt>
              <dd className="text-2xl font-semibold text-gray-900">₹{metrics.total_payables.toLocaleString()}</dd>
            </dl>
            </div>
          </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
            <IoTrendingUp className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Sales This Month</dt>
              <dd className="text-2xl font-semibold text-gray-900">₹{metrics.total_sales_this_month.toLocaleString()}</dd>
            </dl>
            </div>
          </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
            <IoTrendingDown className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Purchases This Month</dt>
              <dd className="text-2xl font-semibold text-gray-900">₹{metrics.total_purchases_this_month.toLocaleString()}</dd>
            </dl>
            </div>
          </div>
          </div>
        </div>
        </div>

        {/* Payment Statistics */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Invoice Payments */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Payments</h3>
          <div className="space-y-4">
            {invoicePayments.map((stat) => (
              <div key={stat.payment_method} className="flex items-center justify-between">
                <div className="flex items-center">
                  <IoWallet className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-500">
                    {stat.payment_method.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">₹{stat.total_amount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{stat.payment_count} payments</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bill Payments */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Bill Payments</h3>
          <div className="space-y-4">
            {billPayments.map((stat) => (
              <div key={stat.payment_method} className="flex items-center justify-between">
                <div className="flex items-center">
                  <IoWallet className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-500">
                    {stat.payment_method.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">₹{stat.total_amount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{stat.payment_count} payments</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Overview Chart */}
      <div className="mt-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="h-80">
            <Bar
              options={chartOptions}
              data={{
                labels: ['Total Orders', 'Pending Orders'],
                datasets: [
                  {
                  label: 'Orders',
                  data: [metrics.total_orders, metrics.pending_orders],
                  backgroundColor: ['rgba(59, 130, 246, 0.5)', 'rgba(239, 68, 68, 0.5)'],
                  borderColor: ['rgb(59, 130, 246)', 'rgb(239, 68, 68)'],
                  borderWidth: 1,
                  },
                ],
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 