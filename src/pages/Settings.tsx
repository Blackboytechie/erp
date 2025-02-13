import { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface CompanySettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  gst_number: string;
  invoice_prefix: string;
  logo_url?: string;
}

interface UserPreferences {
  notifications_enabled: boolean;
  default_invoice_due_days: number;
  default_gst_rate: number;
}

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    name: '',
    address: '',
    phone: '',
    email: '',
    gst_number: '',
    invoice_prefix: '',
  });
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    notifications_enabled: true,
    default_invoice_due_days: 30,
    default_gst_rate: 18,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Fetch company settings
      const { data: companyData, error: companyError } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (companyError && companyError.code !== 'PGRST116') throw companyError;

      if (companyData) {
        setCompanySettings(companyData);
      }

      // Fetch user preferences
      const { data: preferencesData, error: preferencesError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (preferencesError) {
        if (preferencesError.code === 'PGRST116') {
          // Create default preferences if they don't exist
          const defaultPreferences = {
            notifications_enabled: true,
            default_invoice_due_days: 30,
            default_gst_rate: 18,
            user_id: user?.id
          };

          const { data: newPreferences, error: createError } = await supabase
            .from('user_preferences')
            .insert(defaultPreferences)
            .select()
            .single();

          if (createError) throw createError;
          if (newPreferences) {
            setUserPreferences(newPreferences);
          }
        } else {
          throw preferencesError;
        }
      } else if (preferencesData) {
        setUserPreferences(preferencesData);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('company_settings')
        .upsert({
          ...companySettings,
          user_id: user?.id,
        });

      if (error) throw error;
      toast.success('Company settings saved successfully');
    } catch (error) {
      console.error('Error saving company settings:', error);
      toast.error('Failed to save company settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          ...userPreferences,
          user_id: user?.id,
        });

      if (error) throw error;
      toast.success('User preferences saved successfully');
    } catch (error) {
      console.error('Error saving user preferences:', error);
      toast.error('Failed to save user preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="space-y-8 divide-y divide-gray-200">
        {/* Company Settings */}
        <div className="space-y-6 pt-8 sm:pt-10">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">Company Settings</h3>
            <p className="mt-1 text-sm text-gray-500">
              Update your company information that will appear on invoices and other documents.
            </p>
          </div>

          <form onSubmit={handleCompanySubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="company_name"
                    id="company_name"
                    required
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={companySettings.name}
                    onChange={(e) => setCompanySettings({ ...companySettings, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <div className="mt-1">
                  <textarea
                    id="address"
                    name="address"
                    rows={3}
                    required
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={companySettings.address}
                    onChange={(e) => setCompanySettings({ ...companySettings, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <div className="mt-1">
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    required
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={companySettings.phone}
                    onChange={(e) => setCompanySettings({ ...companySettings, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    name="email"
                    id="email"
                    required
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={companySettings.email}
                    onChange={(e) => setCompanySettings({ ...companySettings, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="gst_number" className="block text-sm font-medium text-gray-700">
                  GST Number
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="gst_number"
                    id="gst_number"
                    required
                    pattern="^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
                    title="Please enter a valid GST number (e.g., 29ABCDE1234F1Z5)"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={companySettings.gst_number}
                    onChange={(e) => setCompanySettings({ ...companySettings, gst_number: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="invoice_prefix" className="block text-sm font-medium text-gray-700">
                  Invoice Number Prefix
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="invoice_prefix"
                    id="invoice_prefix"
                    required
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={companySettings.invoice_prefix}
                    onChange={(e) => setCompanySettings({ ...companySettings, invoice_prefix: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Company Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* User Preferences */}
        <div className="space-y-6 pt-8 sm:pt-10">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">User Preferences</h3>
            <p className="mt-1 text-sm text-gray-500">
              Customize your personal preferences for the application.
            </p>
          </div>

          <form onSubmit={handlePreferencesSubmit} className="space-y-6">
            <div className="space-y-6">
              <div className="relative flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="notifications"
                    name="notifications"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    checked={userPreferences.notifications_enabled}
                    onChange={(e) => setUserPreferences({ ...userPreferences, notifications_enabled: e.target.checked })}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="notifications" className="font-medium text-gray-700">
                    Enable Notifications
                  </label>
                  <p className="text-gray-500">Receive notifications for important updates and reminders.</p>
                </div>
              </div>

              <div>
                <label htmlFor="due_days" className="block text-sm font-medium text-gray-700">
                  Default Invoice Due Days
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    name="due_days"
                    id="due_days"
                    min="0"
                    required
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={userPreferences.default_invoice_due_days}
                    onChange={(e) => setUserPreferences({ ...userPreferences, default_invoice_due_days: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="gst_rate" className="block text-sm font-medium text-gray-700">
                  Default GST Rate (%)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    name="gst_rate"
                    id="gst_rate"
                    min="0"
                    max="28"
                    step="0.01"
                    required
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={userPreferences.default_gst_rate}
                    onChange={(e) => setUserPreferences({ ...userPreferences, default_gst_rate: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 