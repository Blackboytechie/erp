import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/config/supabaseClient';
import toast from 'react-hot-toast';
import { ChromePicker } from 'react-color';

interface PDFTemplate {
  id: string;
  name: string;
  description: string | null;
  header_text: string | null;
  footer_text: string | null;
  terms_conditions: string[];
  company_details: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    gst: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  logo_url: string | null;
  is_default: boolean;
}

interface PDFTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  template?: PDFTemplate;
}

const defaultTemplate: Omit<PDFTemplate, 'id'> = {
  name: '',
  description: '',
  header_text: '',
  footer_text: '',
  terms_conditions: [
    'Prices are valid until the specified validity date.',
    'Prices are exclusive of applicable taxes.',
    'Delivery timeline will be confirmed upon order confirmation.',
    'Payment terms: 50% advance, 50% before delivery.',
    'This is a computer-generated quotation and does not require a signature.'
  ],
  company_details: {
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    gst: ''
  },
  colors: {
    primary: '#0284c7',
    secondary: '#0ea5e9',
    accent: '#38bdf8'
  },
  logo_url: '',
  is_default: false
};

const PDFTemplateModal = ({ isOpen, onClose, onSuccess, template }: PDFTemplateModalProps) => {
  const [formData, setFormData] = useState<Omit<PDFTemplate, 'id'>>(defaultTemplate);
  const [loading, setLoading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState<'primary' | 'secondary' | 'accent' | null>(null);

  useEffect(() => {
    if (template) {
      setFormData(template);
    } else {
      setFormData(defaultTemplate);
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (template?.id) {
        // Update existing template
        const { error } = await supabase
          .from('pdf_templates')
          .update(formData)
          .eq('id', template.id);

        if (error) throw error;
        toast.success('Template updated successfully');
      } else {
        // Create new template
        const { error } = await supabase
          .from('pdf_templates')
          .insert(formData);

        if (error) throw error;
        toast.success('Template created successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving template:', error.message);
      toast.error(error.message || 'Error saving template');
    } finally {
      setLoading(false);
    }
  };

  const handleTermChange = (index: number, value: string) => {
    const newTerms = [...formData.terms_conditions];
    newTerms[index] = value;
    setFormData({ ...formData, terms_conditions: newTerms });
  };

  const handleAddTerm = () => {
    setFormData({
      ...formData,
      terms_conditions: [...formData.terms_conditions, '']
    });
  };

  const handleRemoveTerm = (index: number) => {
    const newTerms = formData.terms_conditions.filter((_, i) => i !== index);
    setFormData({ ...formData, terms_conditions: newTerms });
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      {template ? 'Edit PDF Template' : 'New PDF Template'}
                    </Dialog.Title>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-8">
                      {/* Basic Information */}
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Template Name
                          </label>
                          <input
                            type="text"
                            id="name"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Description
                          </label>
                          <textarea
                            id="description"
                            rows={2}
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          />
                        </div>
                      </div>

                      {/* Company Details */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-4">Company Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                              Company Name
                            </label>
                            <input
                              type="text"
                              id="company_name"
                              value={formData.company_details.name}
                              onChange={(e) => setFormData({
                                ...formData,
                                company_details: { ...formData.company_details, name: e.target.value }
                              })}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            />
                          </div>

                          <div>
                            <label htmlFor="company_gst" className="block text-sm font-medium text-gray-700">
                              GST Number
                            </label>
                            <input
                              type="text"
                              id="company_gst"
                              value={formData.company_details.gst}
                              onChange={(e) => setFormData({
                                ...formData,
                                company_details: { ...formData.company_details, gst: e.target.value }
                              })}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            />
                          </div>

                          <div className="col-span-2">
                            <label htmlFor="company_address" className="block text-sm font-medium text-gray-700">
                              Address
                            </label>
                            <textarea
                              id="company_address"
                              rows={2}
                              value={formData.company_details.address}
                              onChange={(e) => setFormData({
                                ...formData,
                                company_details: { ...formData.company_details, address: e.target.value }
                              })}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            />
                          </div>

                          <div>
                            <label htmlFor="company_phone" className="block text-sm font-medium text-gray-700">
                              Phone
                            </label>
                            <input
                              type="text"
                              id="company_phone"
                              value={formData.company_details.phone}
                              onChange={(e) => setFormData({
                                ...formData,
                                company_details: { ...formData.company_details, phone: e.target.value }
                              })}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            />
                          </div>

                          <div>
                            <label htmlFor="company_email" className="block text-sm font-medium text-gray-700">
                              Email
                            </label>
                            <input
                              type="email"
                              id="company_email"
                              value={formData.company_details.email}
                              onChange={(e) => setFormData({
                                ...formData,
                                company_details: { ...formData.company_details, email: e.target.value }
                              })}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            />
                          </div>

                          <div>
                            <label htmlFor="company_website" className="block text-sm font-medium text-gray-700">
                              Website
                            </label>
                            <input
                              type="url"
                              id="company_website"
                              value={formData.company_details.website}
                              onChange={(e) => setFormData({
                                ...formData,
                                company_details: { ...formData.company_details, website: e.target.value }
                              })}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            />
                          </div>

                          <div>
                            <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700">
                              Logo URL
                            </label>
                            <input
                              type="url"
                              id="logo_url"
                              value={formData.logo_url || ''}
                              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Colors */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-4">Colors</h4>
                        <div className="grid grid-cols-3 gap-4">
                          {(['primary', 'secondary', 'accent'] as const).map((color) => (
                            <div key={color}>
                              <label className="block text-sm font-medium text-gray-700 capitalize">
                                {color} Color
                              </label>
                              <div className="mt-1 flex items-center">
                                <button
                                  type="button"
                                  onClick={() => setShowColorPicker(color)}
                                  className="h-8 w-8 rounded-md border border-gray-300"
                                  style={{ backgroundColor: formData.colors[color] }}
                                />
                                <input
                                  type="text"
                                  value={formData.colors[color]}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    colors: { ...formData.colors, [color]: e.target.value }
                                  })}
                                  className="ml-2 block w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                />
                                {showColorPicker === color && (
                                  <div className="absolute mt-2 z-10">
                                    <div
                                      className="fixed inset-0"
                                      onClick={() => setShowColorPicker(null)}
                                    />
                                    <ChromePicker
                                      color={formData.colors[color]}
                                      onChange={(newColor) => setFormData({
                                        ...formData,
                                        colors: { ...formData.colors, [color]: newColor.hex }
                                      })}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Header and Footer */}
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label htmlFor="header_text" className="block text-sm font-medium text-gray-700">
                            Header Text
                          </label>
                          <textarea
                            id="header_text"
                            rows={2}
                            value={formData.header_text || ''}
                            onChange={(e) => setFormData({ ...formData, header_text: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label htmlFor="footer_text" className="block text-sm font-medium text-gray-700">
                            Footer Text
                          </label>
                          <textarea
                            id="footer_text"
                            rows={2}
                            value={formData.footer_text || ''}
                            onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          />
                        </div>
                      </div>

                      {/* Terms and Conditions */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-medium text-gray-900">Terms and Conditions</h4>
                          <button
                            type="button"
                            onClick={handleAddTerm}
                            className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
                          >
                            <PlusIcon className="h-4 w-4 mr-1" />
                            Add Term
                          </button>
                        </div>
                        <div className="space-y-2">
                          {formData.terms_conditions.map((term, index) => (
                            <div key={index} className="flex items-start space-x-2">
                              <textarea
                                value={term}
                                onChange={(e) => handleTermChange(index, e.target.value)}
                                rows={2}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveTerm(index)}
                                className="mt-1 text-red-600 hover:text-red-900"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Set as Default */}
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="is_default"
                          checked={formData.is_default}
                          onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900">
                          Set as default template
                        </label>
                      </div>

                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          disabled={loading}
                          className="inline-flex w-full justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Saving...' : 'Save Template'}
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
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default PDFTemplateModal; 