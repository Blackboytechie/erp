import { Bar, Pie } from 'react-chartjs-2';

interface EventCount {
  sent: number;
  opened: number;
  clicked: number;
  downloaded: number;
  [key: string]: number;
}

interface DailyStats {
  date: string;
  count: number;
}

interface QuotationStats {
  id: string;
  customer_name: string;
  sent: number;
  opened: number;
  clicked: number;
  downloaded: number;
  engagement_rate: number;
}

interface OverviewTabProps {
  eventCounts: EventCount;
  dailyStats: DailyStats[];
  quotationStats: QuotationStats[];
  chartType: 'pie' | 'bar';
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
    },
  },
};

const OverviewTab: React.FC<OverviewTabProps> = ({
  eventCounts,
  dailyStats,
  quotationStats,
  chartType,
}) => {
  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(eventCounts).map(([type, count]) => (
          <div
            key={type}
            className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6 sm:py-6"
          >
            <dt className="truncate text-sm font-medium text-gray-500">
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{count}</dd>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Event distribution chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Event Distribution</h3>
          <div className="h-64">
            {chartType === 'pie' ? (
              <Pie
                data={{
                  labels: Object.keys(eventCounts).map(
                    type => type.charAt(0).toUpperCase() + type.slice(1)
                  ),
                  datasets: [
                    {
                      data: Object.values(eventCounts),
                      backgroundColor: [
                        'rgba(59, 130, 246, 0.5)',
                        'rgba(16, 185, 129, 0.5)',
                        'rgba(245, 158, 11, 0.5)',
                        'rgba(139, 92, 246, 0.5)',
                      ],
                      borderColor: [
                        'rgb(59, 130, 246)',
                        'rgb(16, 185, 129)',
                        'rgb(245, 158, 11)',
                        'rgb(139, 92, 246)',
                      ],
                      borderWidth: 1,
                    },
                  ],
                }}
                options={chartOptions}
              />
            ) : (
              <Bar
                data={{
                  labels: Object.keys(eventCounts).map(
                    type => type.charAt(0).toUpperCase() + type.slice(1)
                  ),
                  datasets: [
                    {
                      label: 'Events',
                      data: Object.values(eventCounts),
                      backgroundColor: 'rgba(59, 130, 246, 0.5)',
                      borderColor: 'rgb(59, 130, 246)',
                      borderWidth: 1,
                    },
                  ],
                }}
                options={chartOptions}
              />
            )}
          </div>
        </div>

        {/* Daily activity chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Activity</h3>
          <div className="h-64">
            <Bar
              data={{
                labels: dailyStats.map(stat => new Date(stat.date).toLocaleDateString()),
                datasets: [
                  {
                    label: 'Events',
                    data: dailyStats.map(stat => stat.count),
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1,
                  },
                ],
              }}
              options={chartOptions}
            />
          </div>
        </div>
      </div>

      {/* Quotation performance table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quotation Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                    Customer
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {quotationStats.map((stat) => (
                  <tr key={stat.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                      {stat.customer_name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{stat.sent}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{stat.opened}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{stat.clicked}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{stat.downloaded}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          stat.engagement_rate >= 70
                            ? 'bg-green-100 text-green-800'
                            : stat.engagement_rate >= 40
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {stat.engagement_rate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default OverviewTab; 