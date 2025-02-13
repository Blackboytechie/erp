import React from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';

interface RecipientStats {
  email: string;
  total_events: number;
  events_by_type: {
    sent: number;
    opened: number;
    clicked: number;
    downloaded: number;
  };
  engagement_rate: number;
  last_activity: string;
}

interface RecipientsTabProps {
  recipientStats: RecipientStats[];
  onExport: () => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const RecipientsTab: React.FC<RecipientsTabProps> = ({
  recipientStats,
  onExport,
  loading = false,
  error = null,
  onRetry,
}) => {
  if (loading) {
    return <LoadingState message="Loading recipient analytics..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  const getEngagementColor = (rate: number) => {
    if (rate >= 75) return 'text-green-800 bg-green-100';
    if (rate >= 50) return 'text-yellow-800 bg-yellow-100';
    return 'text-red-800 bg-red-100';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Recipient Analytics</h3>
              <p className="mt-1 text-sm text-gray-500">
                Detailed engagement metrics for each recipient
              </p>
            </div>
            <button
              onClick={onExport}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export Data
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                    Email
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Total Events
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Sent
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Opened
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Clicked
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Downloaded
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Engagement Rate
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Last Activity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recipientStats.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-4 text-center text-sm text-gray-500">
                      No recipient data available
                    </td>
                  </tr>
                ) : (
                  recipientStats.map((recipient) => (
                    <tr key={recipient.email}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                        {recipient.email}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {recipient.total_events}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {recipient.events_by_type.sent}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {recipient.events_by_type.opened}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {recipient.events_by_type.clicked}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {recipient.events_by_type.downloaded}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getEngagementColor(
                            recipient.engagement_rate
                          )}`}
                        >
                          {recipient.engagement_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(recipient.last_activity).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Engagement Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recipientStats.length > 0 && (
              <>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-500">Average Engagement Rate</h4>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">
                    {(
                      recipientStats.reduce((acc, curr) => acc + curr.engagement_rate, 0) /
                      recipientStats.length
                    ).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-500">Total Recipients</h4>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">
                    {recipientStats.length}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-500">Total Events</h4>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">
                    {recipientStats.reduce((acc, curr) => acc + curr.total_events, 0)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-500">Active Recipients</h4>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">
                    {recipientStats.filter((r) => r.engagement_rate > 0).length}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipientsTab; 