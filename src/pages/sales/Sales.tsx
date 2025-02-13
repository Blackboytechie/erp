import { useState, useEffect } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/config/supabaseClient';
import toast from 'react-hot-toast';
import SaleModal from '../../components/sales/SaleModal';
import { Product } from '@/types/types';


interface SaleItem {
  product_id: string;
  product: Product;
  quantity: number;
  price: number;
}

interface Sale {
  id: string;
  customer_name: string;
  order_date: string;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'overdue';
  delivery_status: 'pending' | 'shipped' | 'delivered';
  created_at: string;
  items: SaleItem[];
}

const Sales = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | undefined>(undefined);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      // Fetch sales with their items
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      // Fetch items for each sale
      const salesWithItems = await Promise.all(
        salesData.map(async (sale) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from('sale_items')
            .select(`
              quantity,
              price,
              product_id,
              products (
                id,
                name,
                sku,
                price,
                stock
              )
            `)
            .eq('sale_id', sale.id);

          if (itemsError) throw itemsError;

          const items = itemsData.map((item) => ({
            product_id: item.product_id,
            product: item.products,
            quantity: item.quantity,
            price: item.price,
          }));

          return { ...sale, items };
        })
      );

      setSales(salesWithItems);
    } catch (error: any) {
      console.error('Error fetching sales:', error.message);
      toast.error('Failed to fetch sales');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (sale: Sale) => {
    setSelectedSale(sale);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this sale?')) return;

    try {
      // First delete sale items
      const { error: itemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', id);

      if (itemsError) throw itemsError;

      // Then delete the sale
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Sale deleted successfully');
      fetchSales();
    } catch (error: any) {
      console.error('Error deleting sale:', error.message);
      toast.error(error.message || 'Error deleting sale');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedSale(undefined);
  };

  const getPaymentStatusColor = (status: Sale['payment_status']) => {
    switch (status) {
      case 'paid':
        return 'text-green-800 bg-green-100';
      case 'pending':
        return 'text-yellow-800 bg-yellow-100';
      case 'overdue':
        return 'text-red-800 bg-red-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  };

  const getDeliveryStatusColor = (status: Sale['delivery_status']) => {
    switch (status) {
      case 'delivered':
        return 'text-green-800 bg-green-100';
      case 'shipped':
        return 'text-blue-800 bg-blue-100';
      case 'pending':
        return 'text-yellow-800 bg-yellow-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Sales</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all sales including customer details, order amount, and delivery status.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="block rounded-md bg-primary-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            <PlusIcon className="inline-block h-5 w-5 mr-1" />
            New Sale
          </button>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            {loading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                      Customer
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Order Date
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Amount
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Payment Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Delivery Status
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-sm text-gray-500">
                        No sales found. Click "New Sale" to create one.
                      </td>
                    </tr>
                  ) : (
                    sales.map((sale) => (
                      <tr key={sale.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                          {sale.customer_name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(sale.order_date).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          ₹{sale.total_amount.toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getPaymentStatusColor(
                              sale.payment_status
                            )}`}
                          >
                            {sale.payment_status.charAt(0).toUpperCase() + sale.payment_status.slice(1)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getDeliveryStatusColor(
                              sale.delivery_status
                            )}`}
                          >
                            {sale.delivery_status.charAt(0).toUpperCase() + sale.delivery_status.slice(1)}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                          <button
                            onClick={() => handleEdit(sale)}
                            className="text-primary-600 hover:text-primary-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(sale.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <SaleModal
        isOpen={showModal}
        onClose={handleModalClose}
        sale={selectedSale}
        onSuccess={fetchSales}
      />
    </div>
  );
};

export default Sales; 