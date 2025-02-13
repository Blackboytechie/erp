import { SignalIcon } from '@heroicons/react/24/outline';

interface RealtimeStatusProps {
  connected: boolean;
  onReconnect: () => void;
}

const RealtimeStatus: React.FC<RealtimeStatusProps> = ({ connected, onReconnect }) => {
  return (
    <div className="flex items-center gap-2">
      <SignalIcon
        className={`h-5 w-5 ${
          connected ? 'text-green-500' : 'text-gray-400'
        }`}
      />
      <span className="text-sm text-gray-500">
        {connected ? 'Real-time updates active' : 'Real-time updates disconnected'}
      </span>
      {!connected && (
        <button
          onClick={onReconnect}
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          Reconnect
        </button>
      )}
    </div>
  );
};

export default RealtimeStatus; 