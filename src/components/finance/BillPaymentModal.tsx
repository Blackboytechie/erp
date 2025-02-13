import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { IoClose } from 'react-icons/io5';
import { supabase } from '../../config/supabaseClient';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface Bill {
  id: string;
  bill_number: string;
  net_amount: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  paid_amount?: number;
}

interface BillPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill;
  onPaymentSaved: () => void;
}

export default function BillPaymentModal({ isOpen, onClose, bill, onPaymentSaved }: BillPaymentModalProps) {
  const [formData, setFormData] = useState({
    amount: bill.net_amount - (bill.paid_amount || 0),
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to record a payment');
      return;
    }

    setLoading(true);
    try {
      // Insert payment record
      const { error: paymentError } = await supabase
        .from('bill_payments')
        .insert([{
          bill_id: bill.id,
          amount: formData.amount,
          payment_date: formData.payment_date,
          payment_method: formData.payment_method,
          reference_number: formData.reference_number,
          notes: formData.notes,
          user_id: user.id,
        }]);

      if (paymentError) throw paymentError;

      toast.success('Payment recorded successfully');
      onPaymentSaved();
      onClose();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
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
                      Record Payment for Bill #{bill.bill_number}
                    </Dialog.Title>
                    <div className="mt-4">
                      {/* Payment Summary */}
                      <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Payment Summary</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Bill Amount:</span>
                            <span className="text-gray-900 font-medium">₹{bill.net_amount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Previously Paid:</span>
                            <span className="text-green-600 font-medium">₹{(bill.paid_amount || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Remaining Balance:</span>
                            <span className="text-red-600 font-medium">₹{(bill.net_amount - (bill.paid_amount || 0)).toLocaleString()}</span>
                          </div>
                          {formData.amount > 0 && (
                            <>
                              <div className="border-t border-gray-200 my-2"></div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Current Payment:</span>
                                <span className="text-primary-600 font-medium">₹{formData.amount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Balance After Payment:</span>
                                <span className="font-medium">₹{(bill.net_amount - (bill.paid_amount || 0) - formData.amount).toLocaleString()}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                          {/* Amount */}
                          <div className="sm:col-span-3">
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                              Amount
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">₹</span>
                              </div>
                              <input
                                type="number"
                                name="amount"
                                id="amount"
                                required
                                min="0.01"
                                step="0.01"
                                max={bill.net_amount - (bill.paid_amount || 0)}
                                className="pl-7 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                              />
                            </div>
                          </div>

                          {/* Payment Date */}
                          <div className="sm:col-span-3">
                            <label htmlFor="payment_date" className="block text-sm font-medium text-gray-700">
                              Payment Date
                            </label>
                            <input
                              type="date"
                              name="payment_date"
                              id="payment_date"
                              required
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              value={formData.payment_date}
                              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                            />
                          </div>

                          {/* Payment Method */}
                          <div className="sm:col-span-3">
                            <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700">
                              Payment Method
                            </label>
                            <select
                              id="payment_method"
                              name="payment_method"
                              required
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              value={formData.payment_method}
                              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                            >
                              <option value="bank_transfer">Bank Transfer</option>
                              <option value="cash">Cash</option>
                              <option value="cheque">Cheque</option>
                              <option value="upi">UPI</option>
                            </select>
                          </div>

                          {/* Reference Number */}
                          <div className="sm:col-span-3">
                            <label htmlFor="reference_number" className="block text-sm font-medium text-gray-700">
                              Reference Number
                            </label>
                            <input
                              type="text"
                              name="reference_number"
                              id="reference_number"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              value={formData.reference_number}
                              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
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

                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? 'Recording Payment...' : 'Record Payment'}
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