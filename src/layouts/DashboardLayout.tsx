import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { ComponentType } from 'react';
import {
  IoHome,
  IoCube,
  IoPeople,
  IoDocument,
  IoBarChart,
  IoSettings,
  IoMenu,
  IoClose,
  IoCash,
  IoCart,
  IoBusinessOutline,
  IoDocuments,
  IoCarOutline,
  IoPersonCircle,
  IoStorefront,
  IoDocumentText,
  IoWallet,
  IoReceipt,
  IoGrid,
  IoArchive,
  IoList
} from 'react-icons/io5';

interface NavItem {
  name: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  roles: string[];
  description?: string;
  children?: Omit<NavItem, 'children'>[];
}

const navigation: NavItem[] = [
  { 
    name: 'Dashboard', 
    path: '/dashboard', 
    icon: IoHome, 
    roles: ['*'],
    description: 'Overview and analytics'
  },
  { 
    name: 'Sales', 
    path: '/sales', 
    icon: IoCash, 
    roles: ['*'],
    description: 'Orders, quotations, and sales analytics'
  },
  { 
    name: 'Inventory', 
    path: '/inventory', 
    icon: IoCube, 
    roles: ['*'],
    description: 'Stock management and tracking',
    children: [
      {
        name: 'Stock Levels',
        path: '/inventory',
        icon: IoCube,
        roles: ['*'],
        description: 'Monitor and adjust stock levels'
      },
      {
        name: 'Products',
        path: '/inventory/products',
        icon: IoCart,
        roles: ['*'],
        description: 'Manage product catalog'
      },
      {
        name: 'Purchase Orders',
        path: '/inventory/purchase-orders',
        icon: IoBusinessOutline,
        roles: ['*'],
        description: 'Manage supplier orders'
      },
      {
        name: 'Suppliers',
        path: '/inventory/suppliers',
        icon: IoStorefront,
        roles: ['*'],
        description: 'Manage suppliers and vendors'
      }
    ]
  },
  { 
    name: 'Purchases', 
    path: '/purchases', 
    icon: IoCart, 
    roles: ['*'],
    description: 'Purchase orders and vendor management'
  },
  { 
    name: 'Customers', 
    path: '/customers', 
    icon: IoPeople, 
    roles: ['*'],
    description: 'Customer management and history'
  },
  { 
    name: 'Vendors', 
    path: '/vendors', 
    icon: IoBusinessOutline, 
    roles: ['*'],
    description: 'Supplier and vendor management'
  },
  { 
    name: 'Finance', 
    path: '/finance', 
    icon: IoWallet, 
    roles: ['user'],
    description: 'Manage invoices, bills, and payments',
    children: [
      {
        name: 'Overview',
        path: '/finance',
        icon: IoGrid,
        roles: ['user'],
        description: 'Financial overview and metrics'
      },
      {
        name: 'Bills',
        path: '/finance/bills',
        icon: IoDocumentText,
        roles: ['user'],
        description: 'Manage supplier bills and payments'
      },
      {
        name: 'Invoices',
        path: '/finance/invoices',
        icon: IoReceipt,
        roles: ['user'],
        description: 'Manage customer invoices and payments'
      }
    ]
  },
  { 
    name: 'Logistics', 
    path: '/logistics', 
    icon: IoCarOutline, 
    roles: ['*'],
    description: 'Shipping and delivery management'
  },
  { 
    name: 'HR', 
    path: '/hr', 
    icon: IoPersonCircle, 
    roles: ['*'],
    description: 'Employee management and payroll'
  },
  { 
    name: 'Reports', 
    path: '/reports', 
    icon: IoBarChart, 
    roles: ['*'],
    description: 'Business analytics and reporting'
  },
  { 
    name: 'Documents', 
    path: '/documents', 
    icon: IoDocuments, 
    roles: ['*'],
    description: 'Document management and storage'
  },
  { 
    name: 'Settings', 
    path: '/settings', 
    icon: IoSettings, 
    roles: ['*'],
    description: 'System configuration and preferences'
  },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();

  const userRole = user?.user_metadata?.role || 'user';
  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(userRole) || item.roles.includes('*')
  );

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <IoClose className="h-6 w-6 text-white" />
            </button>
          </div>
          {/* Sidebar content */}
          <SidebarContent
            navigation={filteredNavigation}
            currentPath={location.pathname}
            onSignOut={signOut}
          />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
            <SidebarContent
              navigation={filteredNavigation}
              currentPath={location.pathname}
              onSignOut={signOut}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={() => setSidebarOpen(true)}
          >
            <IoMenu className="h-6 w-6" />
          </button>
        </div>
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  navigation,
  currentPath,
  onSignOut,
}: {
  navigation: NavItem[];
  currentPath: string;
  onSignOut: () => Promise<void>;
}) {
  const { user } = useAuth();
  const userEmail = user?.email || 'User';

  return (
    <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
      <div className="flex items-center flex-shrink-0 px-4">
        <img className="h-8 w-auto" src="/logo.svg" alt="Your Company" />
      </div>
      <nav className="mt-5 flex-1 px-2 bg-white space-y-1">
        {navigation.map((item) => {
          const isActive = currentPath === item.path || 
            (item.children?.some(child => currentPath === child.path));
          const isChildActive = (path: string) => currentPath === path;

          return (
            <div key={item.name}>
              <Link
                to={item.path}
                className={`${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
              >
                <item.icon
                  className={`${
                    isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                  } mr-3 flex-shrink-0 h-6 w-6`}
                />
                {item.name}
              </Link>
              {item.children && isActive && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.name}
                      to={child.path}
                      className={`${
                        isChildActive(child.path)
                          ? 'bg-gray-50 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                    >
                      <child.icon
                        className={`${
                          isChildActive(child.path) ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                        } mr-3 flex-shrink-0 h-5 w-5`}
                      />
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <button
          onClick={onSignOut}
          className="flex-shrink-0 w-full group block text-left"
        >
          <div className="flex items-center">
            <div>
              <img
                className="inline-block h-9 w-9 rounded-full"
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userEmail)}&background=random`}
                alt=""
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                {userEmail}
              </p>
              <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                Sign out
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
} 