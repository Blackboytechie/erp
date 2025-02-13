import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { 
  CalendarIcon, 
  FunnelIcon,
  ChartPieIcon,
  ChartBarIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

interface DateRange {
  start: Date;
  end: Date;
}

const predefinedRanges = [
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
];

const eventTypes = ['sent', 'opened', 'clicked', 'downloaded'] as const;

interface AnalyticsHeaderProps {
  dateRange: DateRange;
  customDateRange: boolean;
  selectedEventTypes: Set<typeof eventTypes[number]>;
  chartType: 'pie' | 'bar';
  onDateRangeSelect: (days: number) => void;
  onCustomDateChange: (field: 'start' | 'end', value: string) => void;
  onCustomRangeToggle: (value: boolean) => void;
  onEventTypeToggle: (eventType: typeof eventTypes[number]) => void;
  onChartTypeChange: (type: 'pie' | 'bar') => void;
  onExport: () => void;
}

const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  dateRange,
  customDateRange,
  selectedEventTypes,
  chartType,
  onDateRangeSelect,
  onCustomDateChange,
  onCustomRangeToggle,
  onEventTypeToggle,
  onChartTypeChange,
  onExport
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-gray-500" />
          <div className="flex gap-2">
            {!customDateRange && predefinedRanges.map(range => (
              <button
                key={range.days}
                onClick={() => onDateRangeSelect(range.days)}
                className={`px-3 py-1 rounded-md text-sm ${
                  dateRange.start.getTime() === new Date(Date.now() - range.days * 24 * 60 * 60 * 1000).getTime()
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range.label}
              </button>
            ))}
            <button
              onClick={() => onCustomRangeToggle(!customDateRange)}
              className="px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              {customDateRange ? 'Use Presets' : 'Custom Range'}
            </button>
          </div>
        </div>
        {customDateRange && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start.toISOString().split('T')[0]}
              onChange={(e) => onCustomDateChange('start', e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end.toISOString().split('T')[0]}
              onChange={(e) => onCustomDateChange('end', e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <Menu as="div" className="relative">
          <Menu.Button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filter Events
          </Menu.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              {eventTypes.map((type) => (
                <Menu.Item key={type}>
                  {({ active }) => (
                    <button
                      className={`
                        flex items-center px-4 py-2 text-sm w-full
                        ${active ? 'bg-gray-100' : ''}
                        ${selectedEventTypes.has(type) ? 'text-primary-600' : 'text-gray-700'}
                      `}
                      onClick={() => onEventTypeToggle(type)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEventTypes.has(type)}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 mr-2"
                      />
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  )}
                </Menu.Item>
              ))}
            </Menu.Items>
          </Transition>
        </Menu>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChartTypeChange('pie')}
            className={`p-1 rounded ${chartType === 'pie' ? 'text-primary-600' : 'text-gray-400'}`}
            title="Pie Chart"
          >
            <ChartPieIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => onChartTypeChange('bar')}
            className={`p-1 rounded ${chartType === 'bar' ? 'text-primary-600' : 'text-gray-400'}`}
            title="Bar Chart"
          >
            <ChartBarIcon className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={onExport}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
          Export Data
        </button>
      </div>
    </div>
  );
};

export default AnalyticsHeader; 