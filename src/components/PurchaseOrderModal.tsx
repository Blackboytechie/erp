import { IoClose, IoAdd, IoTrash, IoSearch } from 'react-icons/io5';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState, useEffect, useRef, KeyboardEvent } from 'react';
import { supabase } from '@/config/supabaseClient';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { Product } from '@/types/types';

interface Supplier {
  id: string;
  name: string;
  email: string;
  payment_terms: number;
}

interface OrderItem {
  id?: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  gst_rate: number;
  gst_amount: number;
  product?: Product;
}


interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  expected_delivery_date: string;
  status: 'draft' | 'sent' | 'received' | 'cancelled';
  payment_status: 'pending' | 'partial' | 'paid';
  shipping_address: string;
  notes: string;
  total_amount: number;
}

interface StatusHistory {
  created_at: string;
  old_status: string | null;
  new_status: string;
  notes: string | null;
}

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: PurchaseOrder | null;
  onOrderSaved: () => void;
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
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <IoSearch className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>
      {searchQuery && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {products.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">
              No products found
            </div>
          ) : (
            products.map((product, index) => (
              <div
                key={product.id}
                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 ${
                  index === selectedIndex ? 'bg-primary-100 text-primary-900' : 'text-gray-900'
                }`}
                onClick={() => onSelect(product)}
              >
                <div className="flex items-center">
                  <span className="font-normal block truncate">
                    {product.name} - {product.sku}
                  </span>
                </div>
                {index === selectedIndex && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-primary-600">
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function PurchaseOrderModal({
  isOpen,
  onClose,
  order,
  onOrderSaved,
}: PurchaseOrderModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    supplier_id: '',
    expected_delivery_date: format(new Date(), 'yyyy-MM-dd'),
    status: 'draft',
    payment_status: 'pending',
    shipping_address: '',
    notes: '',
  });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const quantityInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [statusNote, setStatusNote] = useState('');
  const [showStatusHistory, setShowStatusHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (order) {
      setFormData({
        supplier_id: order.supplier_id,
        expected_delivery_date: order.expected_delivery_date,
        status: order.status,
        payment_status: order.payment_status,
        shipping_address: order.shipping_address,
        notes: order.notes,
      });
      fetchOrderItems(order.id);
      fetchStatusHistory(order.id);
    } else {
      resetForm();
    }
  }, [order]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
      setSelectedProductIndex(0);
    } else {
      setFilteredProducts([]);
    }
  }, [searchQuery, products]);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Failed to fetch suppliers');
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

  const fetchOrderItems = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('purchase_order_id', orderId);

      if (error) throw error;
      setOrderItems(data || []);
    } catch (error) {
      console.error('Error fetching order items:', error);
      toast.error('Failed to fetch order items');
    }
  };

  const fetchStatusHistory = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('purchase_order_status_history')
        .select('*')
        .eq('purchase_order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStatusHistory(data || []);
    } catch (error) {
      console.error('Error fetching status history:', error);
      toast.error('Failed to fetch status history');
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      expected_delivery_date: format(new Date(), 'yyyy-MM-dd'),
      status: 'draft',
      payment_status: 'pending',
      shipping_address: '',
      notes: '',
    });
    setOrderItems([]);
    setStatusNote('');
  };

  const calculateTotals = () => {
    return orderItems.reduce(
      (acc, item) => {
        const subtotal = item.quantity * item.unit_price;
        const gstAmount = (subtotal * (item.gst_rate || 0)) / 100;
        return {
          total: acc.total + subtotal,
          tax: acc.tax + gstAmount,
          discount: acc.discount || 0, // Keeping discount at 0 since it's not implemented yet
        };
      },
      { total: 0, tax: 0, discount: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to create a purchase order');
      return;
    }

    if (orderItems.length === 0) {
      toast.error('Please add at least one item to the order');
      return;
    }

    // Validate order items
    const invalidItems = orderItems.filter(item => !item.product_id || !item.quantity || !item.unit_price);
    if (invalidItems.length > 0) {
      toast.error('Please ensure all order items have a product, quantity, and price');
      return;
    }

    setLoading(true);
    const totals = calculateTotals();

    try {
      let orderId = order?.id;

      if (!orderId) {
        // Create new purchase order
        const { data: newOrder, error: orderError } = await supabase
          .from('purchase_orders')
          .insert([
            {
              ...formData,
              user_id: user.id,
              total_amount: totals.total + totals.tax - totals.discount,
              status: 'draft',
              payment_status: 'pending',
            },
          ])
          .select()
          .single();

        if (orderError) throw orderError;
        orderId = newOrder.id;
      } else {
        // Update existing purchase order
        const { error: orderError } = await supabase
          .from('purchase_orders')
          .update({
            ...formData,
            user_id: user.id,
            total_amount: totals.total + totals.tax - totals.discount,
          })
          .eq('id', orderId);

        if (orderError) throw orderError;

        // Delete existing order items
        const { error: deleteError } = await supabase
          .from('purchase_order_items')
          .delete()
          .eq('purchase_order_id', orderId);

        if (deleteError) throw deleteError;
      }

      // Insert order items
      const { error: itemsError } = await supabase.from('purchase_order_items').insert(
        orderItems.map(item => ({
          purchase_order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          gst_rate: item.gst_rate || 0,
          gst_amount: (item.quantity * item.unit_price * (item.gst_rate || 0)) / 100,
          total_amount: (item.quantity * item.unit_price * (1 + (item.gst_rate || 0) / 100)),
        }))
      );

      if (itemsError) throw itemsError;

      toast.success(order ? 'Purchase order updated successfully' : 'Purchase order created successfully');
      onOrderSaved();
      onClose();
    } catch (error) {
      console.error('Error saving purchase order:', error);
      toast.error('Failed to save purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    const newItem: OrderItem = {
      product_id: product.id,
      quantity: 1,
      unit_price: product.unit_price,
      total_amount: product.unit_price,
      gst_rate: 18, // Default GST rate
      gst_amount: product.unit_price * 0.18,
    };
    
    const newItems = [...orderItems, newItem];
    setOrderItems(newItems);
    setSearchQuery('');
    setFilteredProducts([]);
    
    // Focus the quantity input of the newly added item
    const newIndex = newItems.length - 1;
    setTimeout(() => {
      quantityInputRefs.current[newIndex]?.focus();
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (filteredProducts.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedProductIndex(prev => 
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedProductIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredProducts[selectedProductIndex]) {
          handleProductSelect(filteredProducts[selectedProductIndex]);
        }
        break;
    }
  };

  const handleQuantityKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index < orderItems.length - 1) {
        quantityInputRefs.current[index + 1]?.focus();
      }
    }
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateOrderItem = (index: number, field: keyof OrderItem, value: any) => {
    const updatedItems = [...orderItems];
    const item = { ...updatedItems[index], [field]: value };

    // Recalculate amounts
    if (field === 'quantity' || field === 'unit_price' || field === 'gst_rate') {
      const subtotal = item.quantity * item.unit_price;
      item.gst_amount = (subtotal * item.gst_rate) / 100;
      item.total_amount = subtotal + item.gst_amount;
    }

    updatedItems[index] = item;
    setOrderItems(updatedItems);
  };

  const canChangeStatus = (currentStatus: string, newStatus: string): boolean => {
    switch (currentStatus) {
      case 'draft':
        return ['sent', 'cancelled'].includes(newStatus);
      case 'sent':
        return ['received', 'cancelled'].includes(newStatus);
      case 'received':
      case 'cancelled':
        return false;
      default:
        return false;
    }
  };

  const getAvailableStatuses = (currentStatus: string): string[] => {
    switch (currentStatus) {
      case 'draft':
        return ['draft', 'sent', 'cancelled'];
      case 'sent':
        return ['sent', 'received', 'cancelled'];
      case 'received':
      case 'cancelled':
        return [currentStatus];
      default:
        return ['draft'];
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
                    <IoClose className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                      {order ? 'Edit Purchase Order' : 'New Purchase Order'}
                    </Dialog.Title>

                    <form onSubmit={handleSubmit} className="mt-4">
                      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        {/* Supplier Selection */}
                        <div className="sm:col-span-3">
                          <label htmlFor="supplier" className="block text-sm font-medium text-gray-700">
                            Supplier
                          </label>
                          <select
                            id="supplier"
                            name="supplier_id"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            value={formData.supplier_id}
                            onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                          >
                            <option value="">Select a supplier</option>
                            {suppliers.map((supplier) => (
                              <option key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Expected Delivery Date */}
                        <div className="sm:col-span-3">
                          <label htmlFor="delivery_date" className="block text-sm font-medium text-gray-700">
                            Expected Delivery Date
                          </label>
                          <input
                            type="date"
                            name="delivery_date"
                            id="delivery_date"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            value={formData.expected_delivery_date}
                            onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                          />
                        </div>

                        {/* Status */}
                        <div className="sm:col-span-3">
                          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                            Status
                          </label>
                          <div className="mt-1 space-y-2">
                            <select
                              id="status"
                              name="status"
                              required
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              value={formData.status}
                              onChange={(e) => {
                                const newStatus = e.target.value as PurchaseOrder['status'];
                                if (!order || canChangeStatus(order.status, newStatus)) {
                                  setFormData({ ...formData, status: newStatus });
                                } else {
                                  toast.error(`Cannot change status from ${order.status} to ${newStatus}`);
                                  e.preventDefault();
                                }
                              }}
                            >
                              {getAvailableStatuses(order?.status || 'draft').map((status) => (
                                <option key={status} value={status}>
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </option>
                              ))}
                            </select>

                            {order && (
                              <button
                                type="button"
                                className="text-sm text-primary-600 hover:text-primary-500"
                                onClick={() => setShowStatusHistory(!showStatusHistory)}
                              >
                                {showStatusHistory ? 'Hide Status History' : 'Show Status History'}
                              </button>
                            )}

                            {showStatusHistory && (
                              <div className="mt-2 border rounded-md p-2 bg-gray-50">
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Status History</h4>
                                <div className="space-y-2">
                                  {statusHistory.length > 0 ? (
                                    statusHistory.map((history, index) => (
                                      <div key={index} className="text-sm text-gray-600">
                                        <div className="flex justify-between">
                                          <span>
                                            {history.old_status ? `${history.old_status} → ${history.new_status}` : history.new_status}
                                          </span>
                                          <span>{format(new Date(history.created_at), 'MMM d, yyyy HH:mm')}</span>
                                        </div>
                                        {history.notes && (
                                          <div className="text-xs text-gray-500 mt-1">{history.notes}</div>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-sm text-gray-500">No status changes recorded yet.</div>
                                  )}
                                </div>
                              </div>
                            )}

                            {formData.status !== order?.status && (
                              <div>
                                <label htmlFor="status_note" className="block text-sm font-medium text-gray-700">
                                  Status Change Note
                                </label>
                                <textarea
                                  id="status_note"
                                  rows={2}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                  value={statusNote}
                                  onChange={(e) => setStatusNote(e.target.value)}
                                  placeholder="Optional note about this status change"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Payment Status */}
                        <div className="sm:col-span-3">
                          <label htmlFor="payment_status" className="block text-sm font-medium text-gray-700">
                            Payment Status
                          </label>
                          <select
                            id="payment_status"
                            name="payment_status"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            value={formData.payment_status}
                            onChange={(e) => setFormData({ ...formData, payment_status: e.target.value as PurchaseOrder['payment_status'] })}
                          >
                            <option value="pending">Pending</option>
                            <option value="partial">Partial</option>
                            <option value="paid">Paid</option>
                          </select>
                        </div>

                        {/* Shipping Address */}
                        <div className="sm:col-span-6">
                          <label htmlFor="shipping_address" className="block text-sm font-medium text-gray-700">
                            Shipping Address
                          </label>
                          <textarea
                            id="shipping_address"
                            name="shipping_address"
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            value={formData.shipping_address}
                            onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                          />
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
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="space-y-4">
                        <h4 className="text-lg font-medium text-gray-900">Order Items</h4>
                        
                        <ProductDropdown
                          products={filteredProducts}
                          searchQuery={searchQuery}
                          selectedIndex={selectedProductIndex}
                          onSelect={handleProductSelect}
                          onSearchChange={setSearchQuery}
                          onKeyDown={handleKeyDown}
                        />

                        <div className="space-y-4">
                          {orderItems.map((item, index) => {
                          const product = products.find(p => p.id === item.product_id);
                          return (
                            <div 
                            key={index} 
                            className="grid grid-cols-1 sm:grid-cols-6 gap-4 p-4 bg-white border rounded-lg shadow-sm"
                            >
                            {/* Product Details - Full width on mobile, 2 columns on desktop */}
                            <div className="sm:col-span-2">
                              <div className="text-sm font-medium text-gray-900">{product?.name}</div>
                              <div className="text-xs text-gray-500">{product?.sku}</div>
                            </div>

                            {/* Quantity - Responsive layout */}
                            <div className="flex flex-col sm:col-span-1">
                              <label className="text-xs text-gray-500 mb-1">Quantity</label>
                              <input
                              type="number"
                              min="1"
                              ref={el => quantityInputRefs.current[index] = el}
                              className="block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                              value={item.quantity}
                              onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 0)}
                              onKeyDown={(e) => handleQuantityKeyDown(e, index)}
                              />
                            </div>

                            {/* Unit Price - Responsive layout */}
                            <div className="flex flex-col sm:col-span-1">
                              <label className="text-xs text-gray-500 mb-1">Unit Price</label>
                              <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                              value={item.unit_price}
                              onChange={(e) => updateOrderItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              />
                            </div>

                            {/* GST - Responsive layout */}
                            <div className="flex flex-col sm:col-span-1">
                              <label className="text-xs text-gray-500 mb-1">GST (%)</label>
                              <input
                              type="number"
                              min="0"
                              max="28"
                              className="block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                              value={item.gst_rate}
                              onChange={(e) => updateOrderItem(index, 'gst_rate', parseFloat(e.target.value) || 0)}
                              />
                            </div>

                            {/* Total and Remove - Responsive layout */}
                            <div className="flex flex-col sm:col-span-1 justify-between">
                              <div>
                              <label className="text-xs text-gray-500 mb-1">Total</label>
                              <div className="text-sm text-gray-700">₹{item.total_amount.toLocaleString()}</div>
                              </div>
                              <button
                              type="button"
                              onClick={() => removeOrderItem(index)}
                              className="mt-2 text-sm text-red-600 hover:text-red-900 self-start"
                              >
                              Remove
                              </button>
                            </div>
                            </div>
                          );
                          })}
                        </div>
                      </div>

                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          disabled={loading}
                          className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Saving...' : order ? 'Update Order' : 'Create Order'}
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
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 