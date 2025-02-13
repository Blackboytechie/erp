import React from 'react';
import { Pie } from 'react-chartjs-2';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';

interface DeviceStats {
  browser: string;
  count: number;
  percentage: number;
}

interface DeviceTypeStats {
  type: 'Mobile' | 'Tablet' | 'Desktop';
  count: number;
  percentage: number;
}

interface DevicesTabProps {
  deviceStats: DeviceStats[];
  deviceTypeStats: DeviceTypeStats[];
  onExport: () => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 20,
        usePointStyle: true,
      },
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const label = context.label || '';
          const value = context.parsed || 0;
          const dataset = context.dataset;
          const total = dataset.data.reduce((acc: number, current: number) => acc + current, 0);
          const percentage = ((value * 100) / total).toFixed(1);
          return `${label}: ${value} (${percentage}%)`;
        },
      },
    },
  },
};

const DevicesTab: React.FC<DevicesTabProps> = ({
  deviceStats,
  deviceTypeStats,
  onExport,
  loading = false,
  error = null,
  onRetry,
}) => {
  if (loading) {
    return <LoadingState message="Loading device analytics..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  const browserChartData = {
    labels: deviceStats.map(stat => stat.browser),
    datasets: [{
      data: deviceStats.map(stat => stat.count),
      backgroundColor: [
        'rgba(59, 130, 246, 0.5)',  // Blue
        'rgba(16, 185, 129, 0.5)',  // Green
        'rgba(245, 158, 11, 0.5)',  // Yellow
        'rgba(139, 92, 246, 0.5)',  // Purple
        'rgba(236, 72, 153, 0.5)',  // Pink
      ],
      borderColor: [
        'rgb(59, 130, 246)',
        'rgb(16, 185, 129)',
        'rgb(245, 158, 11)',
        'rgb(139, 92, 246)',
        'rgb(236, 72, 153)',
      ],
      borderWidth: 1,
    }],
  };

  const deviceTypeChartData = {
    labels: deviceTypeStats.map(stat => stat.type),
    datasets: [{
      data: deviceTypeStats.map(stat => stat.count),
      backgroundColor: [
        'rgba(16, 185, 129, 0.5)',  // Green
        'rgba(245, 158, 11, 0.5)',  // Yellow
        'rgba(59, 130, 246, 0.5)',  // Blue
      ],
      borderColor: [
        'rgb(16, 185, 129)',
        'rgb(245, 158, 11)',
        'rgb(59, 130, 246)',
      ],
      borderWidth: 1,
    }],
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Device & Browser Analytics</h3>
              <p className="mt-1 text-sm text-gray-500">
                Distribution of devices and browsers used to access quotations
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-4">Browser Distribution</h4>
              <div className="h-80">
                <Pie data={browserChartData} options={chartOptions} />
              </div>
              <div className="mt-6 space-y-2">
                {deviceStats.map((stat) => (
                  <div key={stat.browser} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{stat.browser}</span>
                    <div className="flex items-center gap-4">
                      <div className="w-48 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500 min-w-[100px] text-right">
                        {stat.count} views ({stat.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-4">Device Type Distribution</h4>
              <div className="h-80">
                <Pie data={deviceTypeChartData} options={chartOptions} />
              </div>
              <div className="mt-6 space-y-2">
                {deviceTypeStats.map((stat) => (
                  <div key={stat.type} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{stat.type}</span>
                    <div className="flex items-center gap-4">
                      <div className="w-48 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500 min-w-[100px] text-right">
                        {stat.count} views ({stat.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Device Insights</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-500">Most Used Browser</h4>
              <p className="mt-2 text-xl font-semibold text-gray-900">
                {deviceStats.length > 0 ? deviceStats[0].browser : 'N/A'}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {deviceStats.length > 0 ? `${deviceStats[0].percentage.toFixed(1)}% of all views` : ''}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-500">Primary Device Type</h4>
              <p className="mt-2 text-xl font-semibold text-gray-900">
                {deviceTypeStats.length > 0 ? deviceTypeStats[0].type : 'N/A'}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {deviceTypeStats.length > 0 ? `${deviceTypeStats[0].percentage.toFixed(1)}% of all views` : ''}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-500">Total Views</h4>
              <p className="mt-2 text-xl font-semibold text-gray-900">
                {deviceStats.reduce((acc, curr) => acc + curr.count, 0)}
              </p>
              <p className="mt-1 text-sm text-gray-500">Across all devices</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevicesTab; 