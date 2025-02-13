import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface RefreshButtonProps {
  onRefresh: () => void;
  loading?: boolean;
  lastUpdated?: Date;
}

const RefreshButton: React.FC<RefreshButtonProps> = ({ onRefresh, loading, lastUpdated }) => {
  return (
    <div className="flex items-center gap-2">
      {lastUpdated && (
        <span className="text-sm text-gray-500">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </span>
      )}
      <button
        onClick={onRefresh}
        disabled={loading}
        className={`inline-flex items-center p-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${
          loading ? 'animate-spin' : ''
        }`}
        title="Refresh data"
      >
        <ArrowPathIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default RefreshButton; 