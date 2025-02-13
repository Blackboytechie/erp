import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { IoAdd, IoPencil, IoTrash, IoSearch, IoCash } from 'react-icons/io5';
import toast from 'react-hot-toast';
import InvoiceModal from '@/components/finance/InvoiceModal';
import InvoicePaymentModal from '@/components/finance/InvoicePaymentModal';
import { Invoice } from '@/types/index';

interface PaymentStats {
  payment_method: string;
  payment_count: number;
  total_amount: number;
}




export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentStats, setPaymentStats] = useState<PaymentStats[]>([]);

  useEffect(() => {
    fetchInvoices();
    fetchPaymentStats();
  }, []);

  useEffect(() => {
    // Filter invoices based on search query
    const filtered = invoices.filter(invoice => 
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customers.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.payment_status.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredInvoices(filtered);
  }, [searchQuery, invoices]);

  const fetchInvoices = async () => {
    try {
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Fetch paid amounts for each invoice
      const invoicesWithPayments = await Promise.all(
        (invoicesData || []).map(async (invoice) => {
          const { data: paymentsData, error: paymentsError } = await supabase
            .from('invoice_payments')
            .select('amount')
            .eq('invoice_id', invoice.id);

          if (paymentsError) throw paymentsError;

          const paid_amount = paymentsData?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
          return { ...invoice, paid_amount };
        })
      );

      setInvoices(invoicesWithPayments);
      setFilteredInvoices(invoicesWithPayments);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentStats = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_payment_stats');

      if (error) throw error;

      setPaymentStats(data.map((stat: { payment_method: string; payment_count: number; total_amount: number }) => ({
        payment_method: stat.payment_method,
        payment_count: stat.payment_count,
        total_amount: stat.total_amount
      })));
    } catch (error) {
      console.error('Error fetching payment stats:', error);
      toast.error('Failed to fetch payment statistics');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
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

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
  };

  const handleAdd = () => {
    setSelectedInvoice(null);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setInvoices(invoices.filter(invoice => invoice.id !== id));
      toast.success('Invoice deleted successfully');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const handlePayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handlePaymentSaved = () => {
    fetchInvoices();
    fetchPaymentStats();
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
          <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage customer invoices, track payments, and handle approvals.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IoSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search invoices..."
              className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
          >
            <IoAdd className="-ml-1 mr-2 h-5 w-5" />
            Add Invoice
          </button>
        </div>
      </div>

      {/* Payment Statistics */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
        {paymentStats.map((stat) => (
          <div key={stat.payment_method} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <IoCash className="h-6 w-6 text-gray-400" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.payment_method.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        ₹{stat.total_amount.toLocaleString()}
                      </div>
                      <div className="ml-2 text-sm text-gray-500">
                        ({stat.payment_count} payments)
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Invoice Number
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Customer
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Due Date
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Total Amount
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Paid Amount
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Credit Amount
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
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {invoice.invoice_number}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div className="font-medium">{invoice.customers.name}</div>
                        <div className="text-gray-500">{invoice.customers.email}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-medium">
                        ₹{invoice.net_amount.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-green-600 font-medium">
                        ₹{(invoice.paid_amount || 0).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-red-600 font-medium">
                        ₹{(invoice.net_amount - (invoice.paid_amount || 0)).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(invoice.status)}`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        {invoice.payment_status !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => handlePayment(invoice)}
                            className="text-primary-600 hover:text-primary-900 mr-4"
                            title="Record Payment"
                          >
                            <IoCash className="h-5 w-5" aria-hidden="true" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEdit(invoice)}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                          title="Edit Invoice"
                        >
                          <IoPencil className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(invoice.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Invoice"
                        >
                          <IoTrash className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <InvoiceModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        onInvoiceSaved={fetchInvoices}
      />

      {showPaymentModal && selectedInvoice && (
        <InvoicePaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          invoice={selectedInvoice}
          onPaymentSaved={handlePaymentSaved}
        />
      )}
    </div>
  );
} 