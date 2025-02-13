import { useState, useEffect, Fragment } from 'react';
import { 
  PlusIcon, 
  DocumentArrowDownIcon, 
  ArrowPathIcon, 
  EnvelopeIcon, 
  EyeIcon,
  CheckIcon,
  ChevronDownIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { supabase } from '@/config/supabaseClient';
import toast from 'react-hot-toast';
import QuotationModal from '../../components/quotations/QuotationModal';
import { generateQuotationPDF } from '../../utils/pdfGenerator';
import { sendEmail } from '../../utils/emailService';
import EmailModal from '../../components/common/EmailModal';
import PDFPreviewModal from '../../components/common/PDFPreviewModal';
import type { Quotation } from '../../types/quotation';
import TrackingAnalytics from '../../components/quotations/TrackingAnalytics';

// Product interface imported from types/index.ts


interface QuotationItem {
  product_id: string;
  product: Product;
  quantity: number;
  price: number;
}

const Quotations = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | undefined>(undefined);
  const [emailLoading, setEmailLoading] = useState(false);
  const [pdfData, setPdfData] = useState<string>('');
  const [selectedQuotations, setSelectedQuotations] = useState<string[]>([]);
  const [bulkEmailLoading, setBulkEmailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      const { data: quotationsData, error: quotationsError } = await supabase
        .from('quotations')
        .select('*')
        .order('created_at', { ascending: false });

      if (quotationsError) throw quotationsError;

      const quotationsWithItems = await Promise.all(
        quotationsData.map(async (quotation) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from('quotation_items')
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
            .eq('quotation_id', quotation.id);

          if (itemsError) throw itemsError;

          const items = itemsData.map((item) => ({
            product_id: item.product_id,
            product: item.products,
            quantity: item.quantity,
            price: item.price,
          }));

          return { ...quotation, items };
        })
      );

      setQuotations(quotationsWithItems);
    } catch (error: any) {
      console.error('Error fetching quotations:', error.message);
      toast.error('Failed to fetch quotations');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this quotation?')) return;

    try {
      const { error: itemsError } = await supabase
        .from('quotation_items')
        .delete()
        .eq('quotation_id', id);

      if (itemsError) throw itemsError;

      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Quotation deleted successfully');
      fetchQuotations();
    } catch (error: any) {
      console.error('Error deleting quotation:', error.message);
      toast.error(error.message || 'Error deleting quotation');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedQuotation(undefined);
  };

  const getStatusColor = (status: Quotation['status']) => {
    switch (status) {
      case 'accepted':
        return 'text-green-800 bg-green-100';
      case 'sent':
        return 'text-blue-800 bg-blue-100';
      case 'rejected':
        return 'text-red-800 bg-red-100';
      case 'expired':
        return 'text-gray-800 bg-gray-100';
      default:
        return 'text-yellow-800 bg-yellow-100';
    }
  };

  const handleDownloadPDF = (quotation: Quotation) => {
    try {
      generateQuotationPDF(quotation);
      toast.success('PDF downloaded successfully');
    } catch (error: any) {
      console.error('Error generating PDF:', error.message);
      toast.error('Failed to generate PDF');
    }
  };

  const handleConvertToSale = async (quotation: Quotation) => {
    if (quotation.status !== 'accepted') {
      toast.error('Only accepted quotations can be converted to sales');
      return;
    }

    try {
      // Create new sale
      const { data: newSale, error: saleError } = await supabase
        .from('sales')
        .insert({
          customer_name: quotation.customer_name,
          order_date: new Date().toISOString().split('T')[0],
          total_amount: quotation.total_amount,
          payment_status: 'pending',
          delivery_status: 'pending'
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItems = quotation.items.map(item => ({
        sale_id: newSale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Update quotation status
      const { error: updateError } = await supabase
        .from('quotations')
        .update({ status: 'converted' })
        .eq('id', quotation.id);

      if (updateError) throw updateError;

      toast.success('Quotation converted to sale successfully');
      fetchQuotations();
    } catch (error: any) {
      console.error('Error converting quotation to sale:', error.message);
      toast.error(error.message || 'Error converting quotation to sale');
    }
  };

  const handleSendEmail = async (email: string, message: string) => {
    if (!selectedQuotation) return;

    setEmailLoading(true);
    try {
      // Generate PDF as base64
      const pdfBase64 = await generateQuotationPDF(selectedQuotation, true);

      // Send email
      await sendEmail({
        to_email: email,
        to_name: selectedQuotation.customer_name,
        subject: `Quotation Q-${selectedQuotation.id.slice(0, 8).toUpperCase()}`,
        message: message,
        attachment: pdfBase64,
      });

      // Update quotation status if it was in draft
      if (selectedQuotation.status === 'draft') {
        const { error } = await supabase
          .from('quotations')
          .update({ status: 'sent' })
          .eq('id', selectedQuotation.id);

        if (error) throw error;
        fetchQuotations();
      }

      toast.success('Quotation sent successfully');
      setShowEmailModal(false);
    } catch (error: any) {
      console.error('Error sending email:', error.message);
      toast.error(error.message || 'Error sending email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleEmailClick = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setShowEmailModal(true);
  };

  const handlePreviewPDF = async (quotation: Quotation) => {
    try {
      const pdfBase64 = await generateQuotationPDF(quotation, true);
      if (typeof pdfBase64 === 'string') {
        setPdfData(pdfBase64);
        setSelectedQuotation(quotation);
        setShowPDFPreview(true);
      }
    } catch (error: any) {
      console.error('Error generating PDF preview:', error.message);
      toast.error('Failed to generate PDF preview');
    }
  };

  const handleDownloadFromPreview = () => {
    if (selectedQuotation) {
      handleDownloadPDF(selectedQuotation);
    }
  };

  const handleEmailFromPreview = () => {
    setShowPDFPreview(false);
    setShowEmailModal(true);
  };

  const handleSelectQuotation = (id: string) => {
    setSelectedQuotations(prev => 
      prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedQuotations(
      selectedQuotations.length === quotations.length
        ? []
        : quotations.map(q => q.id)
    );
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedQuotations.length} quotations?`)) return;

    try {
      // Delete quotation items first
      const { error: itemsError } = await supabase
        .from('quotation_items')
        .delete()
        .in('quotation_id', selectedQuotations);

      if (itemsError) throw itemsError;

      // Then delete quotations
      const { error } = await supabase
        .from('quotations')
        .delete()
        .in('id', selectedQuotations);

      if (error) throw error;

      toast.success(`${selectedQuotations.length} quotations deleted successfully`);
      setSelectedQuotations([]);
      fetchQuotations();
    } catch (error: any) {
      console.error('Error deleting quotations:', error.message);
      toast.error(error.message || 'Error deleting quotations');
    }
  };

  const handleBulkStatusUpdate = async (status: Quotation['status']) => {
    try {
      const { error } = await supabase
        .from('quotations')
        .update({ status })
        .in('id', selectedQuotations);

      if (error) throw error;

      toast.success(`${selectedQuotations.length} quotations updated successfully`);
      setSelectedQuotations([]);
      fetchQuotations();
    } catch (error: any) {
      console.error('Error updating quotations:', error.message);
      toast.error(error.message || 'Error updating quotations');
    }
  };

  const handleBulkEmail = async (email: string, message: string) => {
    setBulkEmailLoading(true);
    try {
      const selectedQuotationData = quotations.filter(q => selectedQuotations.includes(q.id));
      
      for (const quotation of selectedQuotationData) {
        const pdfBase64 = await generateQuotationPDF(quotation, true);
        await sendEmail({
          to_email: email,
          to_name: quotation.customer_name,
          subject: `Quotation Q-${quotation.id.slice(0, 8).toUpperCase()}`,
          message: message,
          attachment: pdfBase64,
        });

        if (quotation.status === 'draft') {
          const { error } = await supabase
            .from('quotations')
            .update({ status: 'sent' })
            .eq('id', quotation.id);

          if (error) throw error;
        }
      }

      toast.success(`${selectedQuotationData.length} quotations sent successfully`);
      setShowEmailModal(false);
      setSelectedQuotations([]);
      fetchQuotations();
    } catch (error: any) {
      console.error('Error sending emails:', error.message);
      toast.error(error.message || 'Error sending emails');
    } finally {
      setBulkEmailLoading(false);
    }
  };

  return (
    <div>
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('list')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'list'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Quotations List
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'analytics'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Email Analytics
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'list' ? (
        <>
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h1 className="text-2xl font-semibold text-gray-900">Quotations</h1>
              <p className="mt-2 text-sm text-gray-700">
                A list of all quotations including customer details, validity, and status.
              </p>
            </div>
            <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none flex items-center space-x-2">
              {selectedQuotations.length > 0 && (
                <Menu as="div" className="relative inline-block text-left">
                  <div>
                    <Menu.Button className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                      Bulk Actions
                      <ChevronDownIcon className="-mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
                    </Menu.Button>
                  </div>

                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div className="py-1">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => setShowEmailModal(true)}
                              className={`
                                ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'}
                                flex w-full items-center px-4 py-2 text-sm
                              `}
                            >
                              <EnvelopeIcon className="mr-3 h-5 w-5 text-gray-400" />
                              Send Email
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => handleBulkStatusUpdate('sent')}
                              className={`
                                ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'}
                                flex w-full items-center px-4 py-2 text-sm
                              `}
                            >
                              <CheckIcon className="mr-3 h-5 w-5 text-gray-400" />
                              Mark as Sent
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => handleBulkStatusUpdate('expired')}
                              className={`
                                ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'}
                                flex w-full items-center px-4 py-2 text-sm
                              `}
                            >
                              <CheckIcon className="mr-3 h-5 w-5 text-gray-400" />
                              Mark as Expired
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={handleBulkDelete}
                              className={`
                                ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'}
                                flex w-full items-center px-4 py-2 text-sm text-red-600
                              `}
                            >
                              <TrashIcon className="mr-3 h-5 w-5 text-red-400" />
                              Delete Selected
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              )}
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="block rounded-md bg-primary-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                <PlusIcon className="inline-block h-5 w-5 mr-1" />
                New Quotation
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
                        <th scope="col" className="relative py-3.5 pl-4 pr-3 sm:pl-0">
                          <input
                            type="checkbox"
                            className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
                            checked={selectedQuotations.length === quotations.length && quotations.length > 0}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                          Customer
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Valid Until
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Amount
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Status
                        </th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {quotations.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-sm text-gray-500">
                            No quotations found. Click "New Quotation" to create one.
                          </td>
                        </tr>
                      ) : (
                        quotations.map((quotation) => (
                          <tr key={quotation.id}>
                            <td className="relative py-4 pl-4 pr-3 sm:pl-0">
                              <input
                                type="checkbox"
                                className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
                                checked={selectedQuotations.includes(quotation.id)}
                                onChange={() => handleSelectQuotation(quotation.id)}
                              />
                            </td>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                              {quotation.customer_name}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {new Date(quotation.valid_until).toLocaleDateString()}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              ₹{quotation.total_amount.toFixed(2)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusColor(
                                  quotation.status
                                )}`}
                              >
                                {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                              </span>
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                              <button
                                onClick={() => handlePreviewPDF(quotation)}
                                className="text-primary-600 hover:text-primary-900 mr-4"
                                title="Preview PDF"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleEmailClick(quotation)}
                                className="text-primary-600 hover:text-primary-900 mr-4"
                                title="Send Email"
                              >
                                <EnvelopeIcon className="h-5 w-5" />
                              </button>
                              {quotation.status === 'accepted' && (
                                <button
                                  onClick={() => handleConvertToSale(quotation)}
                                  className="text-primary-600 hover:text-primary-900 mr-4"
                                  title="Convert to Sale"
                                >
                                  <ArrowPathIcon className="h-5 w-5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleEdit(quotation)}
                                className="text-primary-600 hover:text-primary-900 mr-4"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(quotation.id)}
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

          <QuotationModal
            isOpen={showModal}
            onClose={handleModalClose}
            quotation={selectedQuotation}
            onSuccess={fetchQuotations}
          />

          <EmailModal
            isOpen={showEmailModal}
            onClose={() => {
              setShowEmailModal(false);
              setSelectedQuotation(undefined);
            }}
            onSend={selectedQuotations.length > 0 ? handleBulkEmail : handleSendEmail}
            loading={selectedQuotations.length > 0 ? bulkEmailLoading : emailLoading}
            defaultEmail=""
            defaultMessage={
              selectedQuotations.length > 0
                ? `Dear Customer,\n\nPlease find attached our quotations for your review.\n\nBest regards,\nDistribution ERP`
                : `Dear ${selectedQuotation?.customer_name},\n\nPlease find attached our quotation for your review.\n\nBest regards,\nDistribution ERP`
            }
          />

          <PDFPreviewModal
            isOpen={showPDFPreview}
            onClose={() => setShowPDFPreview(false)}
            pdfData={pdfData}
            onDownload={handleDownloadFromPreview}
            onEmail={handleEmailFromPreview}
            title={`Quotation Preview - ${selectedQuotation?.customer_name}`}
          />
        </>
      ) : (
        <div className="mt-6">
          <TrackingAnalytics />
        </div>
      )}
    </div>
  );
};

export default Quotations; 