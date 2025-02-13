import { Fragment, useEffect, useState, useRef, KeyboardEvent } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { IoClose, IoSearch } from 'react-icons/io5';
import { supabase } from '../../config/supabaseClient';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { Product } from '@/types/types';

interface Supplier {
  id: string;
  name: string;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
}


interface BillItem {
  id?: string;
  bill_id?: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_amount: number;
  product?: Product;
}

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
  notes: string;
}

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill?: Bill | null;
  onBillSaved: () => void;
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
    <div className="relative mt-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <IoSearch className="h-5 w-5 text-gray-400" />
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
      {searchQuery && products.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {products.map((product, index) => (
            <div
              key={product.id}
              className={`${
                index === selectedIndex ? 'bg-primary-600 text-white' : 'text-gray-900'
              } cursor-default select-none relative py-2 pl-3 pr-9 hover:bg-primary-600 hover:text-white`}
              onClick={() => onSelect(product)}
            >
              <div className="flex items-center">
                <span className="font-normal block truncate">{product.name}</span>
                <span className={`${
                  index === selectedIndex ? 'text-white' : 'text-gray-500'
                } ml-2 truncate`}>
                  ₹{product.unit_price.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BillModal({ isOpen, onClose, bill, onBillSaved }: BillModalProps) {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const quantityInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [formData, setFormData] = useState({
    supplier_id: '',
    purchase_order_id: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    status: 'pending' as Bill['status'],
    payment_status: 'unpaid' as Bill['payment_status'],
  });

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (formData.supplier_id) {
      fetchPurchaseOrders(formData.supplier_id);
    }
  }, [formData.supplier_id]);

  useEffect(() => {
    if (bill) {
      setFormData({
        supplier_id: bill.supplier_id,
        purchase_order_id: bill.purchase_order_id || '',
        bill_date: bill.bill_date,
        due_date: bill.due_date,
        notes: bill.notes,
        status: bill.status,
        payment_status: bill.payment_status,
      });
      fetchBillItems(bill.id);
    } else {
      resetForm();
    }
  }, [bill]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.id.toString().includes(searchQuery.toLowerCase())
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
        .select('id, name')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Failed to fetch suppliers');
    }
  };

  const fetchPurchaseOrders = async (supplierId: string) => {
    try {
      console.log('Fetching POs for supplier:', supplierId);
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, order_number')
        .eq('supplier_id', supplierId)
        .eq('status', 'received')  // Changed from 'approved' to 'received' since POs need to be received before billing
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error details:', error);
        throw error;
      }

      console.log('Fetched POs:', data);
      setPurchaseOrders(data || []);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      toast.error('Failed to fetch purchase orders');
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, unit_price')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  };

  const fetchBillItems = async (billId: string) => {
    try {
      const { data, error } = await supabase
        .from('bill_items')
        .select(`
          id,
          bill_id,
          product_id,
          quantity,
          unit_price,
          tax_rate,
          discount_amount,
          products (
            id,
            name,
            unit_price
          )
        `)
        .eq('bill_id', billId);

      if (error) throw error;
      setBillItems(data || []);
    } catch (error) {
      console.error('Error fetching bill items:', error);
      toast.error('Failed to fetch bill items');
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      purchase_order_id: '',
      bill_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: '',
      status: 'pending',
      payment_status: 'unpaid',
    });
    setBillItems([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addBillItem = () => {
    setBillItems(prev => [
      ...prev,
      {
        product_id: '',
        quantity: 1,
        unit_price: 0,
        tax_rate: 0,
        discount_amount: 0,
      },
    ]);
  };

  const removeBillItem = (index: number) => {
    setBillItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateBillItem = (index: number, field: keyof BillItem, value: any) => {
    setBillItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'product_id') {
        const product = products.find(p => p.id === value);
        if (product) {
          updated[index].unit_price = product.unit_price;
        }
      }

      return updated;
    });
  };

  const calculateTotals = () => {
    return billItems.reduce(
      (acc, item) => {
        const subtotal = item.quantity * item.unit_price;
        const taxAmount = (subtotal * item.tax_rate) / 100;
        return {
          total: acc.total + subtotal,
          tax: acc.tax + taxAmount,
          discount: acc.discount + (item.discount_amount || 0),
        };
      },
      { total: 0, tax: 0, discount: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to create a bill');
      return;
    }

    if (billItems.length === 0) {
      toast.error('Please add at least one item to the bill');
      return;
    }

    // Validate bill items
    const invalidItems = billItems.filter(item => !item.product_id || !item.quantity || !item.unit_price);
    if (invalidItems.length > 0) {
      toast.error('Please ensure all bill items have a product, quantity, and price');
      return;
    }

    setLoading(true);
    const totals = calculateTotals();

    // Convert empty purchase_order_id to null
    const billData = {
      ...formData,
      purchase_order_id: formData.purchase_order_id || null,
      user_id: user.id,
      total_amount: totals.total,
      total_tax_amount: totals.tax,
      total_discount_amount: totals.discount,
      net_amount: totals.total + totals.tax - totals.discount,
    };

    try {
      let billId = bill?.id;

      if (!billId) {
        // Create new bill
        const { data: newBill, error: billError } = await supabase
          .from('bills')
          .insert([billData])
          .select()
          .single();

        if (billError) throw billError;
        billId = newBill.id;
      } else {
        // Update existing bill
        const { error: billError } = await supabase
          .from('bills')
          .update(billData)
          .eq('id', billId);

        if (billError) throw billError;

        // Delete existing bill items
        const { error: deleteError } = await supabase
          .from('bill_items')
          .delete()
          .eq('bill_id', billId);

        if (deleteError) throw deleteError;
      }

      // Insert bill items
      const { error: itemsError } = await supabase.from('bill_items').insert(
        billItems.map(item => ({
          bill_id: billId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate || 0,
          discount_amount: item.discount_amount || 0,
          total_amount: (item.quantity * item.unit_price * (1 + (item.tax_rate || 0) / 100)) - (item.discount_amount || 0),
        }))
      );

      if (itemsError) throw itemsError;

      toast.success(bill ? 'Bill updated successfully' : 'Bill created successfully');
      onBillSaved();
      onClose();
    } catch (error) {
      console.error('Error saving bill:', error);
      toast.error('Failed to save bill');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    setBillItems(prev => [
      ...prev,
      {
        product_id: product.id,
        quantity: 1,
        unit_price: product.unit_price,
        tax_rate: 18, // Default GST rate
        discount_amount: 0,
        product: product,
      },
    ]);
    setSearchQuery('');
    setActiveItemIndex(billItems.length);
    setTimeout(() => {
      quantityInputRefs.current[billItems.length]?.focus();
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!searchQuery) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedProductIndex(prev => 
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedProductIndex(prev => prev > 0 ? prev - 1 : prev);
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

  const totals = calculateTotals();

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-5xl sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <IoClose className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium leading-6 text-gray-900">
                        {bill ? 'Edit Bill' : 'Create New Bill'}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Fill in the details below to {bill ? 'update the' : 'create a new'} bill.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                      <div className="sm:col-span-3">
                        <label htmlFor="supplier_id" className="block text-sm font-medium text-gray-700">
                          Supplier
                        </label>
                        <select
                          id="supplier_id"
                          name="supplier_id"
                          value={formData.supplier_id}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          required
                        >
                          <option value="">Select a supplier</option>
                          {suppliers.map(supplier => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="purchase_order_id" className="block text-sm font-medium text-gray-700">
                          Purchase Order (Optional)
                        </label>
                        <select
                          id="purchase_order_id"
                          name="purchase_order_id"
                          value={formData.purchase_order_id}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        >
                          <option value="">Select a purchase order</option>
                          {purchaseOrders.map(po => (
                            <option key={po.id} value={po.id}>
                              {po.order_number}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="bill_date" className="block text-sm font-medium text-gray-700">
                          Bill Date
                        </label>
                        <input
                          type="date"
                          name="bill_date"
                          id="bill_date"
                          value={formData.bill_date}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          required
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
                          Due Date
                        </label>
                        <input
                          type="date"
                          name="due_date"
                          id="due_date"
                          value={formData.due_date}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          required
                        />
                      </div>

                      <div className="sm:col-span-6">
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                          Notes
                        </label>
                        <textarea
                          name="notes"
                          id="notes"
                          rows={3}
                          value={formData.notes}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center">
                        <h4 className="text-lg font-medium text-gray-900">Bill Items</h4>
                      </div>

                      <div className="mt-4">
                        <ProductDropdown
                          products={filteredProducts}
                          searchQuery={searchQuery}
                          selectedIndex={selectedProductIndex}
                          onSelect={handleProductSelect}
                          onSearchChange={setSearchQuery}
                          onKeyDown={handleKeyDown}
                        />

                        <div className="mt-4">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax Rate (%)</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th scope="col" className="relative px-3 py-3">
                                  <span className="sr-only">Actions</span>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {billItems.map((item, index) => (
                                <tr key={index}>
                                  <td className="px-3 py-4 text-sm text-gray-900">
                                    {products.find(p => p.id === item.product_id)?.name}
                                  </td>
                                  <td className="px-3 py-4 text-sm">
                                    <input
                                      type="number"
                                      min="1"
                                      ref={el => quantityInputRefs.current[index] = el}
                                      className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                      value={item.quantity}
                                      onChange={e => updateBillItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                    />
                                  </td>
                                  <td className="px-3 py-4 text-sm">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                      value={item.unit_price}
                                      onChange={e => updateBillItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                    />
                                  </td>
                                  <td className="px-3 py-4 text-sm">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                      value={item.tax_rate}
                                      onChange={e => updateBillItem(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                                    />
                                  </td>
                                  <td className="px-3 py-4 text-sm">
                                    <input
                                      type="number"
                                      min="0"
                                      className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                      value={item.discount_amount}
                                      onChange={e => updateBillItem(index, 'discount_amount', parseFloat(e.target.value) || 0)}
                                    />
                                  </td>
                                  <td className="px-3 py-4 text-sm text-gray-900">
                                    ₹{((item.quantity * item.unit_price * (1 + item.tax_rate / 100)) - (item.discount_amount || 0)).toLocaleString()}
                                  </td>
                                  <td className="px-3 py-4 text-sm text-right">
                                    <button
                                      type="button"
                                      onClick={() => removeBillItem(index)}
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      Remove
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

                  <div className="mt-6 flex justify-end gap-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    >
                      {loading ? 'Saving...' : bill ? 'Update Bill' : 'Create Bill'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 