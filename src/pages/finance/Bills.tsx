import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { IoAdd, IoPencil, IoTrash, IoSearch, IoWallet } from 'react-icons/io5';
import toast from 'react-hot-toast';
import BillModal from '@/components/finance/BillModal';
import BillPaymentModal from '@/components/finance/BillPaymentModal';

interface Bill {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  supplier_id: string;
  purchase_order_id: string | null;
  total_amount: number;
  total_tax_amount: number;
  total_discount_amount: number;
  net_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  payment_status: 'unpaid' | 'partial' | 'paid';
  paid_amount?: number;
  notes: string;
  suppliers: {
    name: string;
    email: string;
  };
  purchase_orders: {
    order_number: string;
  } | null;
}

interface PaymentStats {
  payment_method: string;
  payment_count: number;
  total_amount: number;
}

export default function Bills() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStats, setPaymentStats] = useState<PaymentStats[]>([]);

  useEffect(() => {
    fetchBills();
    fetchPaymentStats();
  }, []);

  const fetchBills = async () => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select(`
          *,
          suppliers (
            name,
            email
          ),
          purchase_orders (
            order_number
          ),
          bill_payments (
            amount
          )
        `)
        .order('bill_date', { ascending: false });

      if (error) throw error;

      // Calculate paid amount for each bill
      const billsWithPaidAmount = data?.map(bill => ({
        ...bill,
        paid_amount: bill.bill_payments?.reduce((sum: number, payment: { amount: number }) => sum + payment.amount, 0) || 0
      })) || [];

      setBills(billsWithPaidAmount);
    } catch (error) {
      console.error('Error fetching bills:', error);
      toast.error('Failed to fetch bills');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_bill_payment_stats');
      if (error) throw error;
      setPaymentStats(data);
    } catch (error) {
      console.error('Error fetching payment statistics:', error);
      toast.error('Failed to fetch payment statistics');
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const handleEdit = (bill: Bill) => {
    setSelectedBill(bill);
    setShowModal(true);
  };

  const handleAdd = () => {
    setSelectedBill(null);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this bill?')) return;

    try {
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setBills(bills.filter(bill => bill.id !== id));
      toast.success('Bill deleted successfully');
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast.error('Failed to delete bill');
    }
  };

  const handlePayment = (bill: Bill) => {
    setSelectedBill(bill);
    setShowPaymentModal(true);
  };

  const handlePaymentSaved = () => {
    fetchBills();
    fetchPaymentStats();
  };

  const filteredBills = bills.filter(bill =>
    bill.bill_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.suppliers.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Bills</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your bills and payments
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
          >
            <IoAdd className="h-4 w-4 mr-2" />
            Add Bill
          </button>
        </div>
      </div>

      {/* Payment Statistics */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {paymentStats.map((stat) => (
          <div
            key={stat.payment_method}
            className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6 sm:py-6"
          >
            <dt>
              <div className="absolute rounded-md bg-primary-500 p-3">
                <IoWallet className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">
                {stat.payment_method.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </p>
            </dt>
            <dd className="ml-16 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">₹{stat.total_amount.toLocaleString()}</p>
              <p className="ml-2 text-sm text-gray-500">({stat.payment_count} payments)</p>
            </dd>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-lg">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <IoSearch className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-gray-300 pl-10 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="Search bills by number or supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Bills Table */}
      <div className="mt-8 flex flex-col">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Bill Number
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Supplier
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Bill Date
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Due Date
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Amount
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Paid
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Balance
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredBills.map((bill) => (
                    <tr key={bill.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {bill.bill_number}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {bill.suppliers.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(bill.bill_date).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(bill.due_date).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        ₹{bill.net_amount.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-green-600">
                        ₹{(bill.paid_amount || 0).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-red-600">
                        ₹{(bill.net_amount - (bill.paid_amount || 0)).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getPaymentStatusColor(bill.payment_status)}`}>
                          {bill.payment_status}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handlePayment(bill)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Record Payment"
                          >
                            <IoWallet className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(bill)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Edit"
                          >
                            <IoPencil className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(bill.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <IoTrash className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <BillModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          bill={selectedBill}
          onBillSaved={() => {
            fetchBills();
            setShowModal(false);
          }}
        />
      )}

      {showPaymentModal && selectedBill && (
        <BillPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          bill={selectedBill}
          onPaymentSaved={handlePaymentSaved}
        />
      )}
    </div>
  );
} 