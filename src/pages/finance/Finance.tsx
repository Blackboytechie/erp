import { Outlet, useLocation, Link } from 'react-router-dom';
import Overview from './Overview';

export default function Finance() {
  const location = useLocation();
  const isOverview = location.pathname === '/finance';

  const navigation = [
    { name: 'Overview', href: '/finance' },
    { name: 'Bills', href: '/finance/bills' },
    { name: 'Invoices', href: '/finance/invoices' },
    { name: 'Reports', href: '/finance/reports' }
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {isOverview ? (
        <Overview />
      ) : (
        <>
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h1 className="text-2xl font-semibold text-gray-900">Finance</h1>
              <p className="mt-2 text-sm text-gray-700">
                Manage your financial transactions, including bills, invoices, and reports.
              </p>
            </div>
          </div>
          <div className="mt-8">
            <Outlet />
          </div>
        </>
      )}
    </div>
  );
}