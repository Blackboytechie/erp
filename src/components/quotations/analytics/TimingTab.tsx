import React from 'react';
import { Bar } from 'react-chartjs-2';
import { ChartOptions } from 'chart.js';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';

interface TimeStats {
  hour: number;
  count: number;
}

interface DayStats {
  day: number;
  count: number;
  percentage: number;
}

interface TimingTabProps {
  timeStats: TimeStats[];
  dayStats: DayStats[];
  onExport: () => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const TimingTab: React.FC<TimingTabProps> = ({
  timeStats,
  dayStats,
  onExport,
  loading = false,
  error = null,
  onRetry,
}) => {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (loading) {
    return <LoadingState message="Loading timing analytics..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  const hourlyChartData = {
    labels: timeStats.map(stat => `${String(stat.hour).padStart(2, '0')}:00`),
    datasets: [
      {
        label: 'Number of Events',
        data: timeStats.map(stat => stat.count),
        backgroundColor: 'rgba(79, 70, 229, 0.2)',
        borderColor: 'rgb(79, 70, 229)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const hourlyChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Hourly Distribution',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        callbacks: {
          title: (items) => `Hour: ${items[0].label}`,
          label: (item) => `Events: ${item.formattedValue}`,
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Hour of Day',
          font: {
            weight: 'bold' as const,
          },
        },
        grid: {
          display: false,
        },
      },
      y: {
        title: {
          display: true,
          text: 'Number of Events',
          font: {
            weight: 'bold' as const,
          },
        },
        beginAtZero: true,
      },
    },
  };

  const dailyChartData = {
    labels: daysOfWeek,
    datasets: [
      {
        label: 'Number of Events',
        data: dayStats.map(stat => stat.count),
        backgroundColor: 'rgba(79, 70, 229, 0.2)',
        borderColor: 'rgb(79, 70, 229)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const dailyChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Day of Week Distribution',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        callbacks: {
          title: (items) => items[0].label,
          label: (item) => {
            const stats = dayStats[item.dataIndex];
            return [
              `Events: ${item.formattedValue}`,
              `Percentage: ${stats.percentage.toFixed(1)}%`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Events',
          font: {
            weight: 'bold' as const,
          },
        },
      },
    },
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow p-6">
        <Bar data={hourlyChartData} options={hourlyChartOptions} />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <Bar data={dailyChartData} options={dailyChartOptions} />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Day Statistics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dayStats.map((stat) => (
            <div key={stat.day} className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900">{daysOfWeek[stat.day]}</h4>
              <div className="mt-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Events</span>
                  <span>{stat.count}</span>
                </div>
                <div className="mt-1 relative pt-1">
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                    <div
                      style={{ width: `${stat.percentage}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500"
                    ></div>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>Percentage</span>
                  <span>{stat.percentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimingTab; 