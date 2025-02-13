import { Fragment, useState, useEffect, KeyboardEvent, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { IoClose } from 'react-icons/io5';
import { supabase } from '../../config/supabaseClient';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

import { Product, Invoice } from '@/types/types';

interface Customer {
  id: string;
  name: string;
  email: string;
  payment_terms: number;
}

interface InvoiceItem {
  id?: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  product?: Product;
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
  onInvoiceSaved: () => void;
}


interface ProductDropdownProps {
  products: Product[];
  searchQuery: string;
  selectedIndex: number;
  onSelect: (product: Product) => void;
  onSearchChange: (query: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}

function ProductDropdown({
  products,
  searchQuery,
  selectedIndex,
  onSelect,
  onSearchChange,
  onKeyDown,
}: ProductDropdownProps) {
  return (
    <div className="relative">
      <input
        type="text"
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        placeholder="Search products..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {searchQuery && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {products.map((product, index) => (
            <li
              key={product.id}
              className={`relative cursor-pointer select-none py-2 pl-3 pr-9 ${
                index === selectedIndex ? 'bg-primary-100' : 'hover:bg-gray-50'
              }`}
              onClick={() => onSelect(product)}
            >
              <div className="flex items-center">
                <span className="font-normal block truncate">{product.name}</span>
                <span className="ml-2 text-gray-500">₹{product.unit_price.toLocaleString()}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function InvoiceModal({ isOpen, onClose, invoice, onInvoiceSaved }: InvoiceModalProps) {
  const [formData, setFormData] = useState({
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    customer_id: '',
    notes: '',
    status: 'pending' as Invoice['status'],
  });

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const quantityInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const unitPriceInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const taxRateInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const discountInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    if (invoice) {
      setFormData({
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        customer_id: invoice.customer_id,
        notes: invoice.notes,
        status: invoice.status,
      });
      fetchInvoiceItems(invoice.id);
    } else {
      setInvoiceItems([]);
    }
  }, [invoice]);

  useEffect(() => {
    if (formData.customer_id && customers.length > 0) {
      const customer = customers.find(c => c.id === formData.customer_id);
      if (customer) {
        const dueDate = new Date(formData.invoice_date);
        dueDate.setDate(dueDate.getDate() + customer.payment_terms);
        setFormData(prev => ({
          ...prev,
          due_date: dueDate.toISOString().split('T')[0]
        }));
      }
    }
  }, [formData.invoice_date, formData.customer_id, customers]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, payment_terms')
        .eq('status', 'active')
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
        .select('id, name, unit_price, gst_rate')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  };

  const fetchInvoiceItems = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase
        .from('invoice_items')
        .select(`
          *,
          product:products (
            id,
            name,
            unit_price,
            gst_rate
          )
        `)
        .eq('invoice_id', invoiceId);

      if (error) throw error;
      setInvoiceItems(data || []);
    } catch (error) {
      console.error('Error fetching invoice items:', error);
      toast.error('Failed to fetch invoice items');
    }
  };

  const resetForm = () => {
    setFormData({
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      customer_id: '',
      notes: '',
      status: 'pending',
    });
    setInvoiceItems([]);
    setSearchQuery('');
    setSelectedProductIndex(0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setInvoiceItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      
      // Recalculate amounts
      const quantity = item.quantity || 0;
      const unitPrice = item.unit_price || 0;
      const taxRate = item.tax_rate || 0;
      const discountAmount = item.discount_amount || 0;
      
      const subtotal = quantity * unitPrice;
      const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
      const totalAmount = subtotal + taxAmount - discountAmount;
      
      updated[index] = {
        ...item,
        tax_amount: taxAmount,
        total_amount: totalAmount,
      };
      
      return updated;
    });
  };

  const calculateTotals = () => {
    return invoiceItems.reduce(
      (acc, item) => ({
        total_amount: acc.total_amount + (item.quantity * item.unit_price),
        total_tax_amount: acc.total_tax_amount + (item.tax_amount || 0),
        total_discount_amount: acc.total_discount_amount + (item.discount_amount || 0),
        net_amount:
          acc.net_amount +
          (item.quantity * item.unit_price) +
          (item.tax_amount || 0) -
          (item.discount_amount || 0),
      }),
      { total_amount: 0, total_tax_amount: 0, total_discount_amount: 0, net_amount: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to create an invoice');
      return;
    }

    if (invoiceItems.length === 0) {
      toast.error('Please add at least one item to the invoice');
      return;
    }

    const invalidItems = invoiceItems.filter(
      item => !item.product_id || item.quantity <= 0 || item.unit_price <= 0
    );
    if (invalidItems.length > 0) {
      toast.error('Please fill in all required fields for invoice items');
      return;
    }

    setLoading(true);
    const totals = calculateTotals();

    try {
      if (invoice) {
        // Update existing invoice
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            ...formData,
            ...totals,
            user_id: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoice.id);

        if (updateError) throw updateError;

        // Delete existing items
        const { error: deleteError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', invoice.id);

        if (deleteError) throw deleteError;

        // Insert updated items
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(
            invoiceItems.map(({ product, id, ...item }) => ({
              invoice_id: invoice.id,
              ...item,
            }))
          );

        if (itemsError) throw itemsError;
      } else {
        // Create new invoice
        const { data: newInvoice, error: insertError } = await supabase
          .from('invoices')
          .insert([{
            ...formData,
            ...totals,
            user_id: user.id,
          }])
          .select()
          .single();

        if (insertError) throw insertError;

        // Insert new items
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(
            invoiceItems.map(({ product, id, ...item }) => ({
              invoice_id: newInvoice.id,
              ...item,
            }))
          );

        if (itemsError) throw itemsError;
      }

      toast.success(invoice ? 'Invoice updated successfully' : 'Invoice created successfully');
      onInvoiceSaved();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error(invoice ? 'Failed to update invoice' : 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    setInvoiceItems(prev => [
      ...prev,
      {
        product_id: product.id,
        quantity: 1,
        unit_price: product.unit_price,
        tax_rate: product.gst_rate,
        tax_amount: (product.unit_price * product.gst_rate) / 100,
        discount_amount: 0,
        total_amount: product.unit_price + (product.unit_price * product.gst_rate) / 100,
        product: product,
      },
    ]);
    setSearchQuery('');
    setSelectedProductIndex(0);
    
    // Focus the quantity input of the newly added item
    const newIndex = invoiceItems.length;
    setTimeout(() => {
      quantityInputRefs.current[newIndex]?.focus();
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const filteredProducts = products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedProductIndex(prev =>
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedProductIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredProducts[selectedProductIndex]) {
          handleProductSelect(filteredProducts[selectedProductIndex]);
        }
        break;
      case 'Escape':
        setSearchQuery('');
        break;
    }
  };

  const handleFieldKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    index: number,
    field: 'quantity' | 'unit_price' | 'tax_rate' | 'discount'
  ) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      
      // Define the field order
      const fieldOrder = ['quantity', 'unit_price', 'tax_rate', 'discount'];
      const currentFieldIndex = fieldOrder.indexOf(field);
      
      if (currentFieldIndex < fieldOrder.length - 1) {
        // Move to next field in the same row
        const nextField = fieldOrder[currentFieldIndex + 1];
        switch (nextField) {
          case 'quantity':
            quantityInputRefs.current[index]?.focus();
            break;
          case 'unit_price':
            unitPriceInputRefs.current[index]?.focus();
            break;
          case 'tax_rate':
            taxRateInputRefs.current[index]?.focus();
            break;
          case 'discount':
            discountInputRefs.current[index]?.focus();
            break;
        }
      } else if (index < invoiceItems.length - 1) {
        // Move to first field of next row
        quantityInputRefs.current[index + 1]?.focus();
      } else {
        // Move focus back to product search
        const searchInput = document.querySelector('input[placeholder="Search products..."]') as HTMLInputElement;
        searchInput?.focus();
      }
    }
  };

  const removeInvoiceItem = (index: number) => {
    setInvoiceItems(prev => prev.filter((_, i) => i !== index));
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
                    <IoClose className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                      {invoice ? 'Edit Invoice' : 'Create New Invoice'}
                    </Dialog.Title>
                    <div className="mt-4">
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                          {/* Customer */}
                          <div className="sm:col-span-3">
                            <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700">
                              Customer
                            </label>
                            <select
                              id="customer_id"
                              name="customer_id"
                              required
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              value={formData.customer_id}
                              onChange={handleInputChange}
                            >
                              <option value="">Select Customer</option>
                              {customers.map(customer => (
                                <option key={customer.id} value={customer.id}>
                                  {customer.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Invoice Date */}
                          <div className="sm:col-span-3">
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
                              onChange={handleInputChange}
                            />
                          </div>

                          {/* Due Date */}
                          <div className="sm:col-span-3">
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
                              onChange={handleInputChange}
                            />
                          </div>

                          {/* Status */}
                          <div className="sm:col-span-3">
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                              Status
                            </label>
                            <select
                              id="status"
                              name="status"
                              required
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              value={formData.status}
                              onChange={handleInputChange}
                            >
                              <option value="pending">Pending</option>
                              <option value="approved">Approved</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </div>

                          {/* Notes */}
                          <div className="sm:col-span-6">
                            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                              Notes
                            </label>
                            <textarea
                              id="notes"
                              name="notes"
                              rows={3}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              value={formData.notes}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>

                        {/* Invoice Items */}
                        <div className="mt-6">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-lg font-medium text-gray-900">Invoice Items</h4>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-300">
                              <thead>
                                <tr>
                                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                                    Product
                                  </th>
                                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                    Quantity
                                  </th>
                                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                    Unit Price
                                  </th>
                                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                    Tax Rate (%)
                                  </th>
                                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                    Tax Amount
                                  </th>
                                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                    Discount
                                  </th>
                                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                    Total
                                  </th>
                                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                    <span className="sr-only">Actions</span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {invoiceItems.map((item, index) => (
                                  <tr key={index}>
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                      <div>{item.product?.name}</div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                      <input
                                        type="number"
                                        min="1"
                                        required
                                        ref={el => quantityInputRefs.current[index] = el}
                                        className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                        value={item.quantity}
                                        onChange={(e) => updateInvoiceItem(index, 'quantity', parseInt(e.target.value))}
                                        onKeyDown={(e) => handleFieldKeyDown(e, index, 'quantity')}
                                      />
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        ref={el => unitPriceInputRefs.current[index] = el}
                                        className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                        value={item.unit_price}
                                        onChange={(e) => updateInvoiceItem(index, 'unit_price', parseFloat(e.target.value))}
                                        onKeyDown={(e) => handleFieldKeyDown(e, index, 'unit_price')}
                                      />
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        ref={el => taxRateInputRefs.current[index] = el}
                                        className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                        value={item.tax_rate}
                                        onChange={(e) => updateInvoiceItem(index, 'tax_rate', parseFloat(e.target.value))}
                                        onKeyDown={(e) => handleFieldKeyDown(e, index, 'tax_rate')}
                                      />
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                      ₹{item.tax_amount?.toLocaleString()}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        ref={el => discountInputRefs.current[index] = el}
                                        className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                        value={item.discount_amount}
                                        onChange={(e) => updateInvoiceItem(index, 'discount_amount', parseFloat(e.target.value))}
                                        onKeyDown={(e) => handleFieldKeyDown(e, index, 'discount')}
                                      />
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                      ₹{item.total_amount?.toLocaleString()}
                                    </td>
                                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                      <button
                                        type="button"
                                        onClick={() => removeInvoiceItem(index)}
                                        className="text-red-600 hover:text-red-900"
                                      >
                                        Remove
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                <tr>
                                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                    <ProductDropdown
                                      products={products}
                                      searchQuery={searchQuery}
                                      selectedIndex={selectedProductIndex}
                                      onSelect={handleProductSelect}
                                      onSearchChange={setSearchQuery}
                                      onKeyDown={handleKeyDown}
                                    />
                                  </td>
                                  <td colSpan={7}></td>
                                </tr>
                              </tbody>
                              <tfoot>
                                <tr>
                                  <th
                                    scope="row"
                                    colSpan={6}
                                    className="hidden pl-6 pr-3 pt-4 text-right text-sm font-semibold text-gray-900 sm:table-cell"
                                  >
                                    Totals
                                  </th>
                                  <td className="pl-3 pr-4 pt-4 text-right text-sm font-semibold text-gray-900 sm:pr-6">
                                    ₹{calculateTotals().net_amount.toLocaleString()}
                                  </td>
                                  <td></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
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