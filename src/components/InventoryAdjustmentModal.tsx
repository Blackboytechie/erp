import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { IoClose } from 'react-icons/io5';
import { supabase } from '../config/supabaseClient';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { Product } from '@/types/index';


interface InventoryAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAdjustmentSaved: () => void;
}

export default function InventoryAdjustmentModal({
  isOpen,
  onClose,
  product,
  onAdjustmentSaved,
}: InventoryAdjustmentModalProps) {
  const [formData, setFormData] = useState({
    quantity: 0,
    reason: 'correction',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    
    setLoading(true);
    const adjustmentQuantity = formData.quantity;

    try {
      // Start a Supabase transaction
      const { data: adjustment, error: adjustmentError } = await supabase
        .from('inventory_adjustments')
        .insert([{
          adjustment_date: new Date().toISOString(),
          reason: formData.reason,
          notes: formData.notes,
          user_id: user?.id,
        }])
        .select()
        .single();

      if (adjustmentError) throw adjustmentError;

      // Insert adjustment item
      const { error: itemError } = await supabase
        .from('inventory_adjustment_items')
        .insert([{
          adjustment_id: adjustment.id,
          product_id: product.id,
          quantity: adjustmentQuantity,
          reason: formData.notes,
        }]);

      if (itemError) throw itemError;

      // Record the transaction
      const { error: transactionError } = await supabase
        .from('inventory_transactions')
        .insert([{
          product_id: product.id,
          transaction_type: 'adjustment',
          quantity: adjustmentQuantity,
          reference_type: 'adjustment',
          reference_id: adjustment.id,
          notes: formData.notes,
          user_id: user?.id,
        }]);

      if (transactionError) throw transactionError;

      // Update product stock quantity
      const newQuantity = product.stock_quantity + adjustmentQuantity;
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: newQuantity })
        .eq('id', product.id);

      if (updateError) throw updateError;

      toast.success('Stock adjustment saved successfully');
      onAdjustmentSaved();
      onClose();
    } catch (error) {
      console.error('Error saving adjustment:', error);
      toast.error('Failed to save adjustment');
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
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
                      Adjust Stock: {product?.name}
                    </Dialog.Title>
                    <div className="mt-4">
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                            Adjustment Quantity
                          </label>
                          <div className="mt-1">
                            <input
                              type="number"
                              name="quantity"
                              id="quantity"
                              required
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              value={formData.quantity}
                              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                            />
                            <p className="mt-1 text-sm text-gray-500">
                              Use positive numbers to add stock, negative to remove
                            </p>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                            Reason
                          </label>
                          <select
                            id="reason"
                            name="reason"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                          >
                            <option value="correction">Stock Correction</option>
                            <option value="damage">Damaged Goods</option>
                            <option value="loss">Lost/Missing</option>
                            <option value="return">Customer Return</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div>
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

                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? 'Saving...' : 'Save Adjustment'}
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