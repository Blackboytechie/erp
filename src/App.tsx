import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Toaster } from 'react-hot-toast';
import LoadingSpinner from './components/LoadingSpinner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/auth/Login';

const Dashboard = React.lazy(() => 
  import('./pages/Dashboard').catch(() => {
    console.error('Failed to load Dashboard component');
    return Promise.reject(new Error('Failed to load Dashboard component'));
  })
);

const Finance = React.lazy(() => 
  import('./pages/finance/Finance').catch(() => {
    console.error('Failed to load Finance component');
    return { default: () => <div>Error loading Finance</div> };
  })
);

const Bills = React.lazy(() => 
  import('./pages/finance/Bills').catch(() => {
    console.error('Failed to load Bills component');
    return { default: () => <div>Error loading Bills</div> };
  })
);

const Invoices = React.lazy(() => 
  import('./pages/finance/Invoices').catch(() => {
    console.error('Failed to load Invoices component');
    return { default: () => <div>Error loading Invoices</div> };
  })
);

const FinancialReports = React.lazy(() => 
  import('./pages/finance/reports/FinancialReports').catch(() => {
    console.error('Failed to load Financial Reports component');
    return { default: () => <div>Error loading Financial Reports</div> };
  })
);

const Customers = React.lazy(() => 
  import('./pages/Customers').catch(() => {
    console.error('Failed to load Customers component');
    return { default: () => <div>Error loading Customers</div> };
  })
);

const Reports = React.lazy(() => 
  import('./pages/Reports').catch(() => {
    console.error('Failed to load Reports component');
    return { default: () => <div>Error loading Reports</div> };
  })
);

const Settings = React.lazy(() => 
  import('./pages/Settings').catch(() => {
    console.error('Failed to load Settings component');
    return { default: () => <div>Error loading Settings</div> };
  })
);

const Inventory = React.lazy(() => 
  import('./pages/inventory/Inventory').catch(() => {
    console.error('Failed to load Inventory component');
    return { default: () => <div>Error loading Inventory</div> };
  })
);

const Products = React.lazy(() => 
  import('./pages/inventory/Products').catch(() => {
    console.error('Failed to load Products component');
    return { default: () => <div>Error loading Products</div> };
  })
);

const PurchaseOrders = React.lazy(() => 
  import('./pages/inventory/PurchaseOrders')
    .then(module => ({ default: module.PurchaseOrders }))
    .catch(() => {
      console.error('Failed to load Purchase Orders component');
      return { default: () => <div>Error loading Purchase Orders</div> };
    })
);

const Suppliers = React.lazy(() => 
  import('./pages/inventory/Suppliers').catch(() => {
    console.error('Failed to load Suppliers component');
    return { default: () => <div>Error loading Suppliers</div> };
  })
);

function AppContent() {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <>
      <Toaster position="top-right" />
      <DashboardLayout>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="finance" element={<Finance />}>
              <Route path="bills" element={<Bills />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="reports" element={<FinancialReports />} />
            </Route>
            <Route path="inventory">
              <Route index element={<Inventory />} />
              <Route path="products" element={<Products />} />
              <Route path="purchase-orders" element={<PurchaseOrders />} />
              <Route path="suppliers" element={<Suppliers />} />
            </Route>
            <Route path="customers" element={<Customers />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Routes>
        </Suspense>
      </DashboardLayout>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
