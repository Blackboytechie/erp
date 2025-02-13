import React, { useState, useEffect } from 'react';
import { supabase } from '@/config/supabaseClient';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import toast from 'react-hot-toast';
import useRealtimeAnalytics from '../../hooks/useRealtimeAnalytics';

import AnalyticsHeader from './analytics/AnalyticsHeader';
import OverviewTab from './analytics/OverviewTab';
import RecipientsTab from './analytics/RecipientsTab';
import DevicesTab from './analytics/DevicesTab';
import TimingTab from './analytics/TimingTab';
import RefreshButton from './analytics/RefreshButton';
import RealtimeStatus from './analytics/RealtimeStatus';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface TrackingEvent {
  id: string;
  quotation_id: string;
  recipient_email: string;
  event_type: 'sent' | 'opened' | 'clicked' | 'downloaded';
  event_date: string;
  ip_address: string | null;
  user_agent: string | null;
  quotations: {
    id: string;
    customer_name: string;
  } | null;
}

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

interface DateRange {
  start: Date;
  end: Date;
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

interface RecipientStats {
  email: string;
  total_events: number;
  events_by_type: {
    sent: number;
    opened: number;
    clicked: number;
    downloaded: number;
  };
  last_activity: string;
}

interface DeviceStats {
  browser: string;
  count: number;
  percentage: number;
}

interface TimeStats {
  hour: number;
  count: number;
}

interface DayStats {
  day: number;
  count: number;
  percentage: number;
}

interface DeviceTypeStats {
  type: 'Mobile' | 'Tablet' | 'Desktop';
  count: number;
  percentage: number;
}

const eventTypes = ['sent', 'opened', 'clicked', 'downloaded'] as const;

// Add ErrorBoundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Analytics Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
          <p className="text-sm text-gray-500 mb-4">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const TrackingAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [eventCounts, setEventCounts] = useState<EventCount>({
    sent: 0,
    opened: 0,
    clicked: 0,
    downloaded: 0,
  });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [quotationStats, setQuotationStats] = useState<QuotationStats[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [customDateRange, setCustomDateRange] = useState(false);
  const [selectedEventTypes, setSelectedEventTypes] = useState<Set<typeof eventTypes[number]>>(
    new Set(eventTypes)
  );
  const [recipientStats, setRecipientStats] = useState<RecipientStats[]>([]);
  const [deviceStats, setDeviceStats] = useState<DeviceStats[]>([]);
  const [timeStats, setTimeStats] = useState<TimeStats[]>([]);
  const [dayStats, setDayStats] = useState<DayStats[]>([]);
  const [deviceTypeStats, setDeviceTypeStats] = useState<DeviceTypeStats[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'recipients' | 'devices' | 'timing'>('overview');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add loading states for each tab
  const [tabLoading, setTabLoading] = useState<{
    overview: boolean;
    recipients: boolean;
    devices: boolean;
    timing: boolean;
  }>({
    overview: false,
    recipients: false,
    devices: false,
    timing: false,
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, selectedEventTypes]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    setTabLoading(prev => ({ ...prev, [activeTab]: true }));

    try {
      const { data: eventsData, error } = await supabase
        .from('email_tracking')
        .select(`
          *,
          quotations (
            id,
            customer_name
          )
        `)
        .gte('event_date', dateRange.start.toISOString())
        .lte('event_date', dateRange.end.toISOString())
        .order('event_date', { ascending: false });

      if (error) throw error;

      const events = eventsData as TrackingEvent[];
      processAnalyticsData(events);
      setLastUpdated(new Date());
    } catch (error: any) {
      console.error('Error fetching analytics:', error.message);
      setError(error.message || 'Failed to fetch analytics data');
      toast.error('Failed to fetch analytics data');
    } finally {
      setLoading(false);
      setTabLoading(prev => ({ ...prev, [activeTab]: false }));
    }
  };

  const processAnalyticsData = (events: TrackingEvent[]) => {
    // Calculate event counts
    const counts: EventCount = {
      sent: 0,
      opened: 0,
      clicked: 0,
      downloaded: 0,
    };

    events.forEach(event => {
      counts[event.event_type] = (counts[event.event_type] || 0) + 1;
    });

    setEventCounts(counts);

    // Calculate daily statistics
    const dailyData: { [date: string]: number } = {};
    const now = new Date();
    for (let d = new Date(dateRange.start); d <= dateRange.end; d.setDate(d.getDate() + 1)) {
      dailyData[d.toISOString().split('T')[0]] = 0;
    }

    events.forEach(event => {
      const date = event.event_date.split('T')[0];
      dailyData[date] = (dailyData[date] || 0) + 1;
    });

    setDailyStats(
      Object.entries(dailyData).map(([date, count]) => ({
        date,
        count,
      }))
    );

    // Calculate quotation statistics
    const quotationData: { [id: string]: QuotationStats } = {};
    events.forEach(event => {
      if (!event.quotations) return;
      
      const { id, customer_name } = event.quotations;
      if (!quotationData[id]) {
        quotationData[id] = {
          id,
          customer_name,
          sent: 0,
          opened: 0,
          clicked: 0,
          downloaded: 0,
          engagement_rate: 0,
        };
      }
      quotationData[id][event.event_type]++;
    });

    // Calculate engagement rates
    Object.values(quotationData).forEach(stat => {
      if (stat.sent > 0) {
        stat.engagement_rate = ((stat.opened + stat.clicked + stat.downloaded) / (stat.sent * 3)) * 100;
      }
    });

    setQuotationStats(Object.values(quotationData));

    // Calculate recipient statistics
    const recipientData: { [email: string]: RecipientStats } = {};
    events.forEach(event => {
      if (!recipientData[event.recipient_email]) {
        recipientData[event.recipient_email] = {
          email: event.recipient_email,
          total_events: 0,
          events_by_type: {
            sent: 0,
            opened: 0,
            clicked: 0,
            downloaded: 0,
          },
          last_activity: event.event_date,
        };
      }
      const recipient = recipientData[event.recipient_email];
      recipient.total_events++;
      recipient.events_by_type[event.event_type]++;
      if (new Date(event.event_date) > new Date(recipient.last_activity)) {
        recipient.last_activity = event.event_date;
      }
    });

    setRecipientStats(Object.values(recipientData));

    // Calculate browser statistics
    const browserData: { [browser: string]: number } = {};
    let totalBrowserEvents = 0;
    events.forEach(event => {
      if (event.user_agent) {
        const browser = getBrowserFromUserAgent(event.user_agent);
        browserData[browser] = (browserData[browser] || 0) + 1;
        totalBrowserEvents++;
      }
    });

    setDeviceStats(
      Object.entries(browserData)
        .map(([browser, count]) => ({
          browser,
          count,
          percentage: totalBrowserEvents > 0 ? (count / totalBrowserEvents) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)
    );

    // Calculate time-based statistics
    const timeData: { [hour: number]: number } = {};
    events.forEach(event => {
      const hour = new Date(event.event_date).getHours();
      timeData[hour] = (timeData[hour] || 0) + 1;
    });

    setTimeStats(
      Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: timeData[hour] || 0,
      }))
    );

    // Calculate day-of-week patterns
    const dayData: { [day: number]: number } = {};
    let totalDayEvents = 0;
    events.forEach(event => {
      const day = new Date(event.event_date).getDay();
      dayData[day] = (dayData[day] || 0) + 1;
      totalDayEvents++;
    });

    setDayStats(
      Array.from({ length: 7 }, (_, day) => ({
        day,
        count: dayData[day] || 0,
        percentage: totalDayEvents > 0 ? ((dayData[day] || 0) / totalDayEvents) * 100 : 0,
      }))
    );

    // Calculate device type statistics
    const deviceTypeData: { [type: string]: number } = {
      Mobile: 0,
      Tablet: 0,
      Desktop: 0,
    };
    let totalDeviceTypeEvents = 0;

    events.forEach(event => {
      if (event.user_agent) {
        const deviceType = getDeviceTypeFromUserAgent(event.user_agent);
        deviceTypeData[deviceType]++;
        totalDeviceTypeEvents++;
      }
    });

    setDeviceTypeStats(
      Object.entries(deviceTypeData).map(([type, count]) => ({
        type: type as DeviceTypeStats['type'],
        count,
        percentage: totalDeviceTypeEvents > 0 ? (count / totalDeviceTypeEvents) * 100 : 0,
      }))
    );

    setEvents(events);
  };

  const handleRangeSelect = (days: number) => {
    setDateRange({
      start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      end: new Date(),
    });
  };

  const handleCustomDateChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: new Date(value)
    }));
  };

  const handleEventTypeToggle = (eventType: typeof eventTypes[number]) => {
    setSelectedEventTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventType)) {
        if (newSet.size > 1) { // Prevent deselecting all event types
          newSet.delete(eventType);
        }
      } else {
        newSet.add(eventType);
      }
      return newSet;
    });
  };

  const handleExportCSV = () => {
    // Prepare CSV data with more details
    const headers = [
      'Date',
      'Quotation ID',
      'Customer Name',
      'Event Type',
      'Recipient Email',
      'IP Address',
      'User Agent'
    ];
    
    const rows = events.map(event => [
      new Date(event.event_date).toLocaleString(),
      event.quotation_id,
      event.quotations?.customer_name || '',
      event.event_type,
      event.recipient_email,
      event.ip_address || '',
      event.user_agent || ''
    ]);

    // Add summary section
    const summaryRows = [
      [''],
      ['Summary Statistics'],
      ['Event Type', 'Count'],
      ...Object.entries(eventCounts).map(([type, count]) => [type, count]),
      [''],
      ['Quotation Performance'],
      ['Customer', 'Sent', 'Opened', 'Clicked', 'Downloaded', 'Engagement Rate'],
      ...quotationStats.map(stat => [
        stat.customer_name,
        stat.sent,
        stat.opened,
        stat.clicked,
        stat.downloaded,
        `${stat.engagement_rate.toFixed(2)}%`
      ])
    ];

    // Create CSV content
    const csvContent = [
      `Date Range: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`,
      '',
      'Event Details',
      headers.join(','),
      ...rows.map(row => row.join(',')),
      ...summaryRows.map(row => row.join(','))
    ].join('\n');

    downloadCSV(csvContent, `quotation-analytics-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const getBrowserFromUserAgent = (userAgent: string): string => {
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) return 'Internet Explorer';
    return 'Other';
  };

  const getDeviceTypeFromUserAgent = (userAgent: string): string => {
    if (userAgent.includes('Mobile')) return 'Mobile';
    if (userAgent.includes('Tablet')) return 'Tablet';
    return 'Desktop';
  };

  const handleExportTabData = () => {
    let csvContent = '';
    const timestamp = new Date().toISOString().split('T')[0];

    switch (activeTab) {
      case 'recipients':
        csvContent = [
          `Recipient Analytics (${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()})`,
          '',
          ['Email', 'Total Events', 'Sent', 'Opened', 'Clicked', 'Downloaded', 'Last Activity'].join(','),
          ...recipientStats.map(stat => [
            stat.email,
            stat.total_events,
            stat.events_by_type.sent,
            stat.events_by_type.opened,
            stat.events_by_type.clicked,
            stat.events_by_type.downloaded,
            new Date(stat.last_activity).toLocaleString(),
          ].join(','))
        ].join('\n');
        downloadCSV(csvContent, `recipient-analytics-${timestamp}.csv`);
        break;

      case 'devices':
        csvContent = [
          `Device Analytics (${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()})`,
          '',
          'Browser Distribution',
          ['Browser', 'Events', 'Percentage'].join(','),
          ...deviceStats.map(stat => [
            stat.browser,
            stat.count,
            `${stat.percentage.toFixed(1)}%`,
          ].join(',')),
          '',
          'Device Type Distribution',
          ['Device Type', 'Events', 'Percentage'].join(','),
          ...deviceTypeStats.map(stat => [
            stat.type,
            stat.count,
            `${stat.percentage.toFixed(1)}%`,
          ].join(','))
        ].join('\n');
        downloadCSV(csvContent, `device-analytics-${timestamp}.csv`);
        break;

      case 'timing':
        csvContent = [
          `Timing Analytics (${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()})`,
          '',
          'Hourly Distribution',
          ['Hour', 'Events'].join(','),
          ...timeStats.map(stat => [
            `${stat.hour}:00`,
            stat.count,
          ].join(',')),
          '',
          'Daily Distribution',
          ['Day', 'Events', 'Percentage'].join(','),
          ...dayStats.map(stat => [
            ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][stat.day],
            stat.count,
            `${stat.percentage.toFixed(1)}%`,
          ].join(','))
        ].join('\n');
        downloadCSV(csvContent, `timing-analytics-${timestamp}.csv`);
        break;

      default:
        handleExportCSV();
        break;
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const handleNewEvent = (event: TrackingEvent) => {
    // Update event counts
    setEventCounts(prev => ({
      ...prev,
      [event.event_type]: (prev[event.event_type] || 0) + 1
    }));

    // Update daily stats
    const date = event.event_date.split('T')[0];
    setDailyStats(prev => {
      const existingDay = prev.find(stat => stat.date === date);
      if (existingDay) {
        return prev.map(stat =>
          stat.date === date ? { ...stat, count: stat.count + 1 } : stat
        );
      }
      return [...prev, { date, count: 1 }];
    });

    // Update quotation stats with proper null checks
    const quotationDetails = event.quotations;
    if (quotationDetails?.customer_name) {
      setQuotationStats(prev => {
        const existingQuotation = prev.find(stat => stat.id === event.quotation_id);
        if (existingQuotation) {
          return prev.map(stat =>
            stat.id === event.quotation_id
              ? {
                  ...stat,
                  [event.event_type]: stat[event.event_type] + 1,
                  engagement_rate:
                    ((stat.opened + stat.clicked + stat.downloaded + (event.event_type !== 'sent' ? 1 : 0)) /
                      ((stat.sent + (event.event_type === 'sent' ? 1 : 0)) * 3)) *
                    100,
                }
              : stat
          );
        }
        const newStat = {
          id: event.quotation_id,
          customer_name: quotationDetails.customer_name,
          sent: event.event_type === 'sent' ? 1 : 0,
          opened: event.event_type === 'opened' ? 1 : 0,
          clicked: event.event_type === 'clicked' ? 1 : 0,
          downloaded: event.event_type === 'downloaded' ? 1 : 0,
          engagement_rate: 0,
        };
        newStat.engagement_rate =
          ((newStat.opened + newStat.clicked + newStat.downloaded) / (newStat.sent * 3)) * 100;
        return [...prev, newStat];
      });
    }

    // Update recipient stats
    setRecipientStats(prev => {
      const existingRecipient = prev.find(stat => stat.email === event.recipient_email);
      if (existingRecipient) {
        return prev.map(stat =>
          stat.email === event.recipient_email
            ? {
                ...stat,
                total_events: stat.total_events + 1,
                events_by_type: {
                  ...stat.events_by_type,
                  [event.event_type]: stat.events_by_type[event.event_type] + 1,
                },
                last_activity: event.event_date,
              }
            : stat
        );
      }
      return [
        ...prev,
        {
          email: event.recipient_email,
          total_events: 1,
          events_by_type: {
            sent: event.event_type === 'sent' ? 1 : 0,
            opened: event.event_type === 'opened' ? 1 : 0,
            clicked: event.event_type === 'clicked' ? 1 : 0,
            downloaded: event.event_type === 'downloaded' ? 1 : 0,
          },
          last_activity: event.event_date,
        },
      ];
    });

    // Update device stats if user agent is available
    if (event.user_agent) {
      const browser = getBrowserFromUserAgent(event.user_agent);
      const deviceType = getDeviceTypeFromUserAgent(event.user_agent);

      // Update browser stats
      setDeviceStats(prev => {
        const total = prev.reduce((sum, stat) => sum + stat.count, 0) + 1;
        const updated = prev.map(stat => ({
          ...stat,
          percentage: (stat.count / total) * 100,
        }));
        const existingBrowser = updated.find(stat => stat.browser === browser);
        if (existingBrowser) {
          return updated.map(stat =>
            stat.browser === browser
              ? { ...stat, count: stat.count + 1, percentage: ((stat.count + 1) / total) * 100 }
              : stat
          );
        }
        return [
          ...updated,
          { browser, count: 1, percentage: (1 / total) * 100 },
        ].sort((a, b) => b.count - a.count);
      });

      // Update device type stats
      setDeviceTypeStats(prev => {
        const total = prev.reduce((sum, stat) => sum + stat.count, 0) + 1;
        return prev.map(stat => ({
          ...stat,
          count: stat.type === deviceType ? stat.count + 1 : stat.count,
          percentage: stat.type === deviceType
            ? ((stat.count + 1) / total) * 100
            : (stat.count / total) * 100,
        }));
      });
    }

    // Update time stats
    const hour = new Date(event.event_date).getHours();
    setTimeStats(prev =>
      prev.map(stat =>
        stat.hour === hour ? { ...stat, count: stat.count + 1 } : stat
      )
    );

    // Update day stats
    const day = new Date(event.event_date).getDay();
    setDayStats(prev => {
      const total = prev.reduce((sum, stat) => sum + stat.count, 0) + 1;
      return prev.map(stat => ({
        ...stat,
        count: stat.day === day ? stat.count + 1 : stat.count,
        percentage: ((stat.day === day ? stat.count + 1 : stat.count) / total) * 100,
      }));
    });

    // Show notification
    toast.success(`New ${event.event_type} event from ${event.recipient_email}`);

    // Update lastUpdated
    setLastUpdated(new Date());
  };

  const { connected, reconnect } = useRealtimeAnalytics({
    onNewEvent: handleNewEvent,
    onError: (error) => {
      console.error('Real-time update error:', error);
      toast.error('Real-time update error: ' + error.message);
    },
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
        <AnalyticsHeader
          dateRange={dateRange}
          customDateRange={customDateRange}
          selectedEventTypes={selectedEventTypes}
          chartType={chartType}
          onDateRangeSelect={handleRangeSelect}
          onCustomDateChange={handleCustomDateChange}
          onCustomRangeToggle={setCustomDateRange}
          onEventTypeToggle={handleEventTypeToggle}
          onChartTypeChange={setChartType}
          onExport={handleExportTabData}
        />
        <div className="flex flex-col gap-2 sm:items-end">
          <RefreshButton
            onRefresh={fetchAnalytics}
            loading={loading}
            lastUpdated={lastUpdated || undefined}
          />
          <RealtimeStatus
            connected={connected}
            onReconnect={reconnect}
          />
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'recipients', label: 'Recipients' },
            { id: 'devices', label: 'Devices' },
            { id: 'timing', label: 'Timing' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <OverviewTab
            eventCounts={eventCounts}
            dailyStats={dailyStats}
            quotationStats={quotationStats}
            chartType={chartType}
          />
        )}

        {activeTab === 'recipients' && (
          <RecipientsTab
            recipientStats={recipientStats}
            onExport={handleExportTabData}
          />
        )}

        {activeTab === 'devices' && (
          <DevicesTab
            deviceStats={deviceStats}
            deviceTypeStats={deviceTypeStats}
            onExport={handleExportTabData}
          />
        )}

        {activeTab === 'timing' && (
          <TimingTab
            timeStats={timeStats}
            dayStats={dayStats}
            onExport={handleExportTabData}
          />
        )}
      </div>
    </div>
  );
};

export default TrackingAnalytics; 