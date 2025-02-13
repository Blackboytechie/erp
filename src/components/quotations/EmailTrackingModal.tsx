import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface EmailTrackingEvent {
  id: string;
  quotation_id: string;
  recipient_email: string;
  event_type: 'sent' | 'opened' | 'clicked' | 'downloaded';
  event_date: string;
  ip_address: string | null;
  user_agent: string | null;
}

interface EmailTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EmailTrackingEvent[];
  quotationId: string;
}

const getEventIcon = (eventType: EmailTrackingEvent['event_type']) => {
  switch (eventType) {
    case 'sent':
      return '📨';
    case 'opened':
      return '👁️';
    case 'clicked':
      return '🖱️';
    case 'downloaded':
      return '⬇️';
    default:
      return '📝';
  }
};

const getEventColor = (eventType: EmailTrackingEvent['event_type']) => {
  switch (eventType) {
    case 'sent':
      return 'text-blue-800 bg-blue-100';
    case 'opened':
      return 'text-green-800 bg-green-100';
    case 'clicked':
      return 'text-yellow-800 bg-yellow-100';
    case 'downloaded':
      return 'text-purple-800 bg-purple-100';
    default:
      return 'text-gray-800 bg-gray-100';
  }
};

const EmailTrackingModal = ({ isOpen, onClose, events, quotationId }: EmailTrackingModalProps) => {
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div>
                  <div className="mt-3 text-center sm:mt-0 sm:text-left">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Email Tracking - Quotation {quotationId.slice(0, 8).toUpperCase()}
                    </Dialog.Title>
                    <div className="mt-4">
                      {events.length === 0 ? (
                        <p className="text-sm text-gray-500">No tracking events found for this quotation.</p>
                      ) : (
                        <div className="flow-root">
                          <ul role="list" className="-mb-8">
                            {events.map((event, eventIdx) => (
                              <li key={event.id}>
                                <div className="relative pb-8">
                                  {eventIdx !== events.length - 1 ? (
                                    <span
                                      className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                                      aria-hidden="true"
                                    />
                                  ) : null}
                                  <div className="relative flex space-x-3">
                                    <div>
                                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                                        {getEventIcon(event.event_type)}
                                      </span>
                                    </div>
                                    <div className="flex min-w-0 flex-1 justify-between space-x-4">
                                      <div>
                                        <p className="text-sm text-gray-500">
                                          <span className="font-medium text-gray-900">
                                            {event.recipient_email}
                                          </span>{' '}
                                          <span
                                            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getEventColor(
                                              event.event_type
                                            )}`}
                                          >
                                            {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                                          </span>
                                        </p>
                                        {(event.ip_address || event.user_agent) && (
                                          <p className="mt-1 text-xs text-gray-500">
                                            {event.ip_address && `IP: ${event.ip_address}`}
                                            {event.ip_address && event.user_agent && ' | '}
                                            {event.user_agent && `Browser: ${event.user_agent}`}
                                          </p>
                                        )}
                                      </div>
                                      <div className="whitespace-nowrap text-right text-sm text-gray-500">
                                        <time dateTime={event.event_date}>
                                          {new Date(event.event_date).toLocaleString()}
                                        </time>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default EmailTrackingModal; 