import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/config/supabaseClient';
import toast from 'react-hot-toast';
import { Product } from '@/types/types';



interface SaleItem {
  product_id: string;
  product: Product;
  quantity: number;
  price: number;
}

interface Sale {
  id?: string;
  customer_name: string;
  order_date: string;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'overdue';
  delivery_status: 'pending' | 'shipped' | 'delivered';
  items: SaleItem[];
}

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale?: Sale;
  onSuccess: () => void;
}

const SaleModal = ({ isOpen, onClose, sale, onSuccess }: SaleModalProps) => {
  const [formData, setFormData] = useState<Sale>({
    customer_name: '',
    order_date: new Date().toISOString().split('T')[0],
    total_amount: 0,
    payment_status: 'pending',
    delivery_status: 'pending',
    items: [],
  });
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    fetchProducts();
    if (sale) {
      setFormData(sale);
    } else {
      setFormData({
        customer_name: '',
        order_date: new Date().toISOString().split('T')[0],
        total_amount: 0,
        payment_status: 'pending',
        delivery_status: 'pending',
        items: [],
      });
    }
  }, [sale]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error.message);
      toast.error('Failed to fetch products');
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct || quantity <= 0) return;

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    if (quantity > product.stock) {
      toast.error(`Only ${product.stock} units available in stock`);
      return;
    }

    const existingItem = formData.items.find(item => item.product_id === selectedProduct);
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.stock) {
        toast.error(`Only ${product.stock} units available in stock`);
        return;
      }

      setFormData(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.product_id === selectedProduct
            ? { ...item, quantity: newQuantity }
            : item
        ),
        total_amount: calculateTotal([
          ...prev.items.filter(item => item.product_id !== selectedProduct),
          { ...existingItem, quantity: newQuantity },
        ]),
      }));
    } else {
      const newItem: SaleItem = {
        product_id: product.id,
        product,
        quantity,
        price: product.price,
      };

      setFormData(prev => ({
        ...prev,
        items: [...prev.items, newItem],
        total_amount: calculateTotal([...prev.items, newItem]),
      }));
    }

    setSelectedProduct('');
    setQuantity(1);
  };

  const handleRemoveItem = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.product_id !== productId),
      total_amount: calculateTotal(prev.items.filter(item => item.product_id !== productId)),
    }));
  };

  const calculateTotal = (items: SaleItem[]) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    setLoading(true);

    try {
      const saleData = {
        customer_name: formData.customer_name,
        order_date: formData.order_date,
        total_amount: formData.total_amount,
        payment_status: formData.payment_status,
        delivery_status: formData.delivery_status,
      };

      if (sale?.id) {
        // Update existing sale
        const { error } = await supabase
          .from('sales')
          .update(saleData)
          .eq('id', sale.id);

        if (error) throw error;

        // Update sale items
        const { error: itemsError } = await supabase
          .from('sale_items')
          .delete()
          .eq('sale_id', sale.id);

        if (itemsError) throw itemsError;

        const saleItems = formData.items.map(item => ({
          sale_id: sale.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        }));

        const { error: insertError } = await supabase
          .from('sale_items')
          .insert(saleItems);

        if (insertError) throw insertError;

        toast.success('Sale updated successfully');
      } else {
        // Create new sale
        const { data: newSale, error } = await supabase
          .from('sales')
          .insert(saleData)
          .select()
          .single();

        if (error) throw error;

        const saleItems = formData.items.map(item => ({
          sale_id: newSale.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        }));

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItems);

        if (itemsError) throw itemsError;

        toast.success('Sale created successfully');
      }

      // Update product stock
      for (const item of formData.items) {
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock: item.product.stock - item.quantity })
          .eq('id', item.product_id);

        if (stockError) throw stockError;
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving sale:', error.message);
      toast.error(error.message || 'Error saving sale');
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      {sale ? 'Edit Sale' : 'New Sale'}
                    </Dialog.Title>
                    <div className="mt-4">
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700">
                            Customer Name
                          </label>
                          <input
                            type="text"
                            name="customer_name"
                            id="customer_name"
                            required
                            value={formData.customer_name}
                            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label htmlFor="order_date" className="block text-sm font-medium text-gray-700">
                            Order Date
                          </label>
                          <input
                            type="date"
                            name="order_date"
                            id="order_date"
                            required
                            value={formData.order_date}
                            onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="col-span-2">
                            <label htmlFor="product" className="block text-sm font-medium text-gray-700">
                              Product
                            </label>
                            <select
                              id="product"
                              value={selectedProduct}
                              onChange={(e) => setSelectedProduct(e.target.value)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            >
                              <option value="">Select a product</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name} (₹{product.price}) - {product.stock} in stock
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                              Quantity
                            </label>
                            <div className="mt-1 flex rounded-md shadow-sm">
                              <input
                                type="number"
                                name="quantity"
                                id="quantity"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value))}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              />
                              <button
                                type="button"
                                onClick={handleAddItem}
                                className="ml-2 inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
                              >
                                <PlusIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700">Items</h4>
                          <div className="mt-2 flow-root">
                            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                <table className="min-w-full divide-y divide-gray-300">
                                  <thead>
                                    <tr>
                                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                                        Product
                                      </th>
                                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Quantity
                                      </th>
                                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Price
                                      </th>
                                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Total
                                      </th>
                                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                                        <span className="sr-only">Actions</span>
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {formData.items.map((item) => (
                                      <tr key={item.product_id}>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                                          {item.product.name}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                          {item.quantity}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                          ₹{item.price}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                          ₹{(item.price * item.quantity).toFixed(2)}
                                        </td>
                                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveItem(item.product_id)}
                                            className="text-red-600 hover:text-red-900"
                                          >
                                            <TrashIcon className="h-4 w-4" />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                    {formData.items.length === 0 && (
                                      <tr>
                                        <td colSpan={5} className="py-4 text-center text-sm text-gray-500">
                                          No items added yet
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                  <tfoot>
                                    <tr>
                                      <th
                                        scope="row"
                                        colSpan={3}
                                        className="pl-4 pr-3 pt-4 text-right text-sm font-semibold text-gray-900 sm:pl-0"
                                      >
                                        Total
                                      </th>
                                      <td className="pl-3 pr-4 pt-4 text-right text-sm font-semibold text-gray-900 sm:pr-0" colSpan={2}>
                                        ₹{formData.total_amount.toFixed(2)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="payment_status" className="block text-sm font-medium text-gray-700">
                              Payment Status
                            </label>
                            <select
                              id="payment_status"
                              value={formData.payment_status}
                              onChange={(e) => setFormData({ ...formData, payment_status: e.target.value as Sale['payment_status'] })}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            >
                              <option value="pending">Pending</option>
                              <option value="paid">Paid</option>
                              <option value="overdue">Overdue</option>
                            </select>
                          </div>

                          <div>
                            <label htmlFor="delivery_status" className="block text-sm font-medium text-gray-700">
                              Delivery Status
                            </label>
                            <select
                              id="delivery_status"
                              value={formData.delivery_status}
                              onChange={(e) => setFormData({ ...formData, delivery_status: e.target.value as Sale['delivery_status'] })}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            >
                              <option value="pending">Pending</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                            </select>
                          </div>
                        </div>

                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex w-full justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
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
};

export default SaleModal; 