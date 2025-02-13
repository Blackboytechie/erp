import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XIcon, PlusIcon, TrashIcon } from '@heroicons/react/outline';
import { supabase } from '../config/supabaseClient';
import toast from 'react-hot-toast';
import { Product, Invoice } from '@/types/index';

interface Customer {
  id: number;
  name: string;
  email: string;
  gst_number: string;
}

interface InvoiceItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  gst_amount: number;
  total: number;
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null | undefined;
  onInvoiceSaved: () => void;
}


export default function InvoiceModal({ isOpen, onClose, invoice, onInvoiceSaved }: InvoiceModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft' as 'draft' | 'sent' | 'paid' | 'overdue',
    items: [] as InvoiceItem[],
  });

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (invoice) {
      setFormData({
        customer_id: invoice.customer_id.toString(),
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        status: invoice.status,
        items: invoice.items,
      });
    } else {
      setFormData({
        customer_id: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        items: [],
      });
    }
  }, [invoice]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, gst_number')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers');
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, unit_price')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          product_id: 0,
          product_name: '',
          quantity: 1,
          unit_price: 0,
          gst_rate: 18, // Default GST rate
          gst_amount: 0,
          total: 0,
        },
      ],
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...formData.items];
    const item = { ...updatedItems[index], [field]: value };

    // If product is selected, update product details
    if (field === 'product_id') {
      const product = products.find((p) => p.id === parseInt(value));
      if (product) {
        item.product_name = product.name;
        item.unit_price = product.unit_price;
      }
    }

    // Calculate GST and total
    const subtotal = item.quantity * item.unit_price;
    item.gst_amount = (subtotal * item.gst_rate) / 100;
    item.total = subtotal + item.gst_amount;

    updatedItems[index] = item;
    setFormData({ ...formData, items: updatedItems });
  };

  const calculateTotals = () => {
    const totals = formData.items.reduce(
      (acc, item) => ({
        total: acc.total + item.total,
        gst: acc.gst + item.gst_amount,
      }),
      { total: 0, gst: 0 }
    );

    return totals;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const totals = calculateTotals();
    const invoiceData = {
      customer_id: parseInt(formData.customer_id),
      invoice_date: formData.invoice_date,
      due_date: formData.due_date,
      status: formData.status,
      total_amount: totals.total,
      gst_amount: totals.gst,
      items: formData.items,
    };

    try {
      if (invoice) {
        // Update existing invoice
        const { error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', invoice.id);

        if (error) throw error;
        toast.success('Invoice updated successfully');
      } else {
        // Create new invoice
        const { error } = await supabase
          .from('invoices')
          .insert([invoiceData]);

        if (error) throw error;
        toast.success('Invoice created successfully');
      }

      onInvoiceSaved();
      onClose();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error(invoice ? 'Failed to update invoice' : 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6">
                <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                      {invoice ? 'Edit Invoice' : 'Create New Invoice'}
                    </Dialog.Title>
                    <div className="mt-4">
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-3">
                          <div>
                            <label htmlFor="customer" className="block text-sm font-medium text-gray-700">
                              Customer
                            </label>
                            <select
                              id="customer"
                              name="customer_id"
                              required
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              value={formData.customer_id}
                              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                            >
                              <option value="">Select a customer</option>
                              {customers.map((customer) => (
                                <option key={customer.id} value={customer.id}>
                                  {customer.name} ({customer.gst_number})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label htmlFor="invoice_date" className="block text-sm font-medium text-gray-700">
                              Invoice Date
                            </label>
                            <input
                              type="date"
                              name="invoice_date"
                              id="invoice_date"
                              required
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              value={formData.invoice_date}
                              onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                            />
                          </div>

                          <div>
                            <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
                              Due Date
                            </label>
                            <input
                              type="date"
                              name="due_date"
                              id="due_date"
                              required
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              value={formData.due_date}
                              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center">
                            <h4 className="text-base font-medium text-gray-900">Items</h4>
                            <button
                              type="button"
                              onClick={addItem}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                              <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
                              Add Item
                            </button>
                          </div>

                          <table className="mt-4 min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Product
                                </th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Quantity
                                </th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Unit Price
                                </th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  GST Rate
                                </th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  GST Amount
                                </th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Total
                                </th>
                                <th scope="col" className="relative px-3 py-2">
                                  <span className="sr-only">Actions</span>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {formData.items.map((item, index) => (
                                <tr key={index}>
                                  <td className="px-3 py-2">
                                    <select
                                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                      value={item.product_id}
                                      onChange={(e) => updateItem(index, 'product_id', parseInt(e.target.value))}
                                      required
                                    >
                                      <option value="">Select a product</option>
                                      {products.map((product) => (
                                        <option key={product.id} value={product.id}>
                                          {product.name} ({product.sku})
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="number"
                                      min="1"
                                      className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                      value={item.quantity}
                                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                                      required
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                      value={item.unit_price}
                                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                                      required
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <select
                                      className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                      value={item.gst_rate}
                                      onChange={(e) => updateItem(index, 'gst_rate', parseInt(e.target.value))}
                                      required
                                    >
                                      <option value="0">0%</option>
                                      <option value="5">5%</option>
                                      <option value="12">12%</option>
                                      <option value="18">18%</option>
                                      <option value="28">28%</option>
                                    </select>
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className="text-sm text-gray-900">₹{item.gst_amount.toFixed(2)}</span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className="text-sm text-gray-900">₹{item.total.toFixed(2)}</span>
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <button
                                      type="button"
                                      onClick={() => removeItem(index)}
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      <TrashIcon className="h-5 w-5" />
                                      <span className="sr-only">Remove</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <th
                                  scope="row"
                                  colSpan={4}
                                  className="px-3 py-2 text-right text-sm font-medium text-gray-900"
                                >
                                  Totals
                                </th>
                                <td className="px-3 py-2 text-sm text-gray-900">
                                  ₹{calculateTotals().gst.toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-900">
                                  ₹{calculateTotals().total.toFixed(2)}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? 'Saving...' : invoice ? 'Update Invoice' : 'Create Invoice'}
                          </button>
                          <button
                            type="button"
                            className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                            onClick={onClose}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 