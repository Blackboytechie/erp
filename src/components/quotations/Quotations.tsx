import { useState, useEffect, Fragment } from 'react';
import { 
  PlusIcon, 
  DocumentArrowDownIcon, 
  ArrowPathIcon, 
  EnvelopeIcon, 
  EyeIcon,
  CheckIcon,
  ChevronDownIcon,
  TrashIcon,
  ChartBarIcon
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
import EmailTrackingModal from './EmailTrackingModal';

interface EmailTrackingEvent {
  id: string;
  quotation_id: string;
  recipient_email: string;
  event_type: 'sent' | 'opened' | 'clicked' | 'downloaded';
  event_date: string;
  ip_address: string | null;
  user_agent: string | null;
}

const Quotations = () => {
  // ... existing state variables ...
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingEvents, setTrackingEvents] = useState<EmailTrackingEvent[]>([]);

  // ... existing code ...

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

      // Record email sent event
      const { error: trackingError } = await supabase
        .from('email_tracking')
        .insert({
          quotation_id: selectedQuotation.id,
          recipient_email: email,
          event_type: 'sent'
        });

      if (trackingError) throw trackingError;

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

        // Record email sent event
        const { error: trackingError } = await supabase
          .from('email_tracking')
          .insert({
            quotation_id: quotation.id,
            recipient_email: email,
            event_type: 'sent'
          });

        if (trackingError) throw trackingError;

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

  const handleViewTracking = async (quotation: Quotation) => {
    try {
      const { data, error } = await supabase
        .from('email_tracking')
        .select('*')
        .eq('quotation_id', quotation.id)
        .order('event_date', { ascending: false });

      if (error) throw error;

      setTrackingEvents(data);
      setSelectedQuotation(quotation);
      setShowTrackingModal(true);
    } catch (error: any) {
      console.error('Error fetching tracking events:', error.message);
      toast.error('Failed to fetch tracking events');
    }
  };

  return (
    <div>
      {/* ... existing JSX ... */}
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
        <button
          onClick={() => handleViewTracking(quotation)}
          className="text-primary-600 hover:text-primary-900 mr-4"
          title="View Email Tracking"
        >
          <ChartBarIcon className="h-5 w-5" />
        </button>
        {/* ... rest of the buttons ... */}
      </td>
      {/* ... existing JSX ... */}

      <EmailTrackingModal
        isOpen={showTrackingModal}
        onClose={() => {
          setShowTrackingModal(false);
          setSelectedQuotation(undefined);
        }}
        events={trackingEvents}
        quotationId={selectedQuotation?.id || ''}
      />
      
      {/* ... existing modals ... */}
    </div>
  );
};

export default Quotations; 