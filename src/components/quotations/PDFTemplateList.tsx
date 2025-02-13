import { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/config/supabaseClient';
import toast from 'react-hot-toast';
import PDFTemplateModal from './PDFTemplateModal';

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

const PDFTemplateList = () => {
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PDFTemplate | undefined>(undefined);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error.message);
      toast.error('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: PDFTemplate) => {
    setSelectedTemplate(template);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('pdf_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Template deleted successfully');
      fetchTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error.message);
      toast.error(error.message || 'Error deleting template');
    }
  };

  const handleSetDefault = async (template: PDFTemplate) => {
    try {
      // First, unset any existing default
      const { error: unsetError } = await supabase
        .from('pdf_templates')
        .update({ is_default: false })
        .eq('is_default', true);

      if (unsetError) throw unsetError;

      // Then, set the new default
      const { error } = await supabase
        .from('pdf_templates')
        .update({ is_default: true })
        .eq('id', template.id);

      if (error) throw error;

      toast.success('Default template updated');
      fetchTemplates();
    } catch (error: any) {
      console.error('Error setting default template:', error.message);
      toast.error(error.message || 'Error setting default template');
    }
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-xl font-semibold text-gray-900">PDF Templates</h2>
          <p className="mt-2 text-sm text-gray-700">
            Manage your quotation PDF templates including company details, colors, and terms.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => {
              setSelectedTemplate(undefined);
              setShowModal(true);
            }}
            className="block rounded-md bg-primary-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
          >
            <PlusIcon className="inline-block h-5 w-5 mr-1" />
            New Template
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
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                      Name
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Description
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Company
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
                  {templates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-sm text-gray-500">
                        No templates found. Click "New Template" to create one.
                      </td>
                    </tr>
                  ) : (
                    templates.map((template) => (
                      <tr key={template.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                          {template.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {template.description || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {template.company_details.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          {template.is_default ? (
                            <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                              Default
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetDefault(template)}
                              className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                            >
                              Set as Default
                            </button>
                          )}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                          <button
                            onClick={() => handleEdit(template)}
                            className="text-primary-600 hover:text-primary-900 mr-4"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          {!template.is_default && (
                            <button
                              onClick={() => handleDelete(template.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
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

      <PDFTemplateModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedTemplate(undefined);
        }}
        template={selectedTemplate}
        onSuccess={fetchTemplates}
      />
    </div>
  );
};

export default PDFTemplateList; 