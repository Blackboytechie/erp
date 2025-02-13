import { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { ChartBarIcon, TrendingUpIcon, CurrencyDollarIcon, UserGroupIcon } from '@heroicons/react/outline';
import toast from 'react-hot-toast';

interface ReportMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  activeCustomers: number;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  topCustomers: Array<{
    name: string;
    orders: number;
    revenue: number;
  }>;
  monthlySales: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
}

export default function Reports() {
  const [metrics, setMetrics] = useState<ReportMetrics>({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    activeCustomers: 0,
    topProducts: [],
    topCustomers: [],
    monthlySales: [],
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));
      const startDateStr = startDate.toISOString();

      // Fetch total revenue and orders
      const { data: salesData, error: salesError } = await supabase
        .from('invoices')
        .select('total_amount, created_at')
        .gte('created_at', startDateStr);

      if (salesError) throw salesError;

      const totalRevenue = salesData?.reduce((sum, invoice) => sum + invoice.total_amount, 0) || 0;
      const totalOrders = salesData?.length || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Fetch active customers
      const { count: activeCustomers, error: customersError } = await supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .gte('created_at', startDateStr);

      if (customersError) throw customersError;

      // Fetch top products
      const { data: topProducts, error: productsError } = await supabase
        .from('invoice_items')
        .select(`
          product_id,
          products (name),
          quantity,
          total
        `)
        .gte('created_at', startDateStr)
        .order('total', { ascending: false })
        .limit(5);

      if (productsError) throw productsError;

      // Fetch top customers
      const { data: topCustomers, error: topCustomersError } = await supabase
        .from('invoices')
        .select(`
          customer_id,
          customers (name),
          total_amount
        `)
        .gte('created_at', startDateStr)
        .order('total_amount', { ascending: false })
        .limit(5);

      if (topCustomersError) throw topCustomersError;

      // Calculate monthly sales
      const monthlySales = calculateMonthlySales(salesData || []);

      setMetrics({
        totalRevenue,
        totalOrders,
        averageOrderValue,
        activeCustomers: activeCustomers || 0,
        topProducts: topProducts?.map(item => ({
          name: item.products.name,
          quantity: item.quantity,
          revenue: item.total,
        })) || [],
        topCustomers: topCustomers?.map(item => ({
          name: item.customers.name,
          orders: 1, // This would need a separate count query
          revenue: item.total_amount,
        })) || [],
        monthlySales,
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlySales = (salesData: any[]) => {
    const monthlyData = salesData.reduce((acc: any, sale: any) => {
      const month = new Date(sale.created_at).toLocaleString('default', { month: 'long' });
      if (!acc[month]) {
        acc[month] = { revenue: 0, orders: 0 };
      }
      acc[month].revenue += sale.total_amount;
      acc[month].orders += 1;
      return acc;
    }, {});

    return Object.entries(monthlyData).map(([month, data]: [string, any]) => ({
      month,
      revenue: data.revenue,
      orders: data.orders,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Reports & Analytics</h1>
          <p className="mt-2 text-sm text-gray-700">
            A comprehensive overview of your business performance and key metrics.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <select
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                  <dd className="text-lg font-medium text-gray-900">₹{metrics.totalRevenue.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                  <dd className="text-lg font-medium text-gray-900">{metrics.totalOrders}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUpIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Average Order Value</dt>
                  <dd className="text-lg font-medium text-gray-900">₹{metrics.averageOrderValue.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Customers</dt>
                  <dd className="text-lg font-medium text-gray-900">{metrics.activeCustomers}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Top Products */}
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Top Products</h3>
            <div className="mt-5">
              <div className="flow-root">
                <ul className="-my-5 divide-y divide-gray-200">
                  {metrics.topProducts.map((product) => (
                    <li key={product.name} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                          <p className="text-sm text-gray-500">Quantity: {product.quantity}</p>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          ₹{product.revenue.toLocaleString()}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Top Customers</h3>
            <div className="mt-5">
              <div className="flow-root">
                <ul className="-my-5 divide-y divide-gray-200">
                  {metrics.topCustomers.map((customer) => (
                    <li key={customer.name} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{customer.name}</p>
                          <p className="text-sm text-gray-500">Orders: {customer.orders}</p>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          ₹{customer.revenue.toLocaleString()}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Sales Trend */}
        <div className="bg-white shadow rounded-lg lg:col-span-2">
          <div className="p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Monthly Sales Trend</h3>
            <div className="mt-5">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orders
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {metrics.monthlySales.map((month) => (
                    <tr key={month.month}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {month.month}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {month.orders}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{month.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 