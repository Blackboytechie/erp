import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

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

interface UseRealtimeAnalyticsProps {
  onNewEvent?: (event: TrackingEvent) => void;
  onError?: (error: Error) => void;
}

const useRealtimeAnalytics = ({ onNewEvent, onError }: UseRealtimeAnalyticsProps = {}) => {
  const [subscription, setSubscription] = useState<RealtimeChannel | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Subscribe to real-time updates
    const channel = supabase
      .channel('email_tracking_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email_tracking',
        },
        async (payload) => {
          try {
            // Fetch the complete event data including the quotation details
            const { data, error } = await supabase
              .from('email_tracking')
              .select(`
                *,
                quotations (
                  id,
                  customer_name
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (error) throw error;
            if (data && onNewEvent) {
              onNewEvent(data as TrackingEvent);
            }
          } catch (error) {
            console.error('Error fetching new tracking event:', error);
            if (onError && error instanceof Error) {
              onError(error);
            }
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          console.log('Connected to real-time updates');
        } else if (status === 'CLOSED') {
          console.log('Disconnected from real-time updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error connecting to real-time updates');
          if (onError) {
            onError(new Error('Failed to connect to real-time updates'));
          }
        }
      });

    setSubscription(channel);

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [onNewEvent, onError]);

  const reconnect = async () => {
    if (subscription) {
      await supabase.removeChannel(subscription);
      setSubscription(null);
      setConnected(false);
    }
  };

  return {
    connected,
    reconnect,
  };
};

export default useRealtimeAnalytics; 