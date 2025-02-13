import { useEffect, useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { IoTrendingUp, IoCart, IoWarning, IoWallet, IoBarChart, IoStorefront } from 'react-icons/io5';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardMetrics {
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  pending_orders: number;
  low_stock_items: number;
  top_customers: Array<{
    name: string;
    total_orders: number;
    total_revenue: number;
  }>;
  top_products: Array<{
    name: string;
    category: string;
    total_quantity: number;
    total_revenue: number;
  }>;
  sales_trend: Array<{
    date: string;
    revenue: number;
  }>;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    total_revenue: 0,
    total_orders: 0,
    average_order_value: 0,
    pending_orders: 0,
    low_stock_items: 0,
    top_customers: [],
    top_products: [],
    sales_trend: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch main metrics
      const { data: metricsData, error: metricsError } = await supabase
        .rpc('get_distribution_metrics');

      if (metricsError) throw metricsError;

      // Fetch top customers
      const { data: customersData, error: customersError } = await supabase
        .rpc('get_top_customers', { limit_count: 5 });

      if (customersError) throw customersError;

      // Fetch top products
      const { data: productsData, error: productsError } = await supabase
        .rpc('get_top_products', { limit_count: 5 });

      if (productsError) throw productsError;

      // Fetch sales trend
      const { data: trendData, error: trendError } = await supabase
        .rpc('get_sales_trend', { days_count: 30 });

      if (trendError) throw trendError;

      setMetrics({
        ...metricsData[0],
        top_customers: customersData,
        top_products: productsData,
        sales_trend: trendData
      });
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: '30-Day Sales Trend'
      }
    },
    scales: {
      y: {
        type: 'linear' as const,
        beginAtZero: true,
        ticks: {
          callback: function(this: any, value: number | string) {
            if (typeof value === 'number') {
              return `₹${value.toLocaleString()}`;
            }
            return value;
          }
        }
      }
    }
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
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <IoTrendingUp className="h-6 w-6 text-blue-500" />
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
                <IoCart className="h-6 w-6 text-green-500" />
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
                <IoWallet className="h-6 w-6 text-purple-500" />
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
                <IoWarning className="h-6 w-6 text-red-500" />
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

      {/* Sales Trend Chart */}
      <div className="mt-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="h-80">
            <Line
              options={chartOptions}
              data={{
                labels: metrics.sales_trend.map(item => new Date(item.date).toLocaleDateString()),
                datasets: [
                  {
                    label: 'Revenue',
                    data: metrics.sales_trend.map(item => item.revenue),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                  }
                ]
              }}
            />
          </div>
        </div>
      </div>

      {/* Top Customers and Products */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Customers */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Customers</h3>
          <div className="space-y-4">
            {metrics.top_customers.map((customer) => (
              <div key={customer.name} className="flex items-center justify-between">
                <div className="flex items-center">
                  <IoStorefront className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-900">{customer.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">₹{customer.total_revenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{customer.total_orders} orders</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Products</h3>
          <div className="space-y-4">
            {metrics.top_products.map((product) => (
              <div key={product.name} className="flex items-center justify-between">
                <div className="flex items-center">
                  <IoBarChart className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-900">{product.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">₹{product.total_revenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{product.total_quantity} units sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 