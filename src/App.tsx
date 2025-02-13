import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Toaster } from 'react-hot-toast';
import LoadingSpinner from './components/LoadingSpinner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/auth/Login';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Finance = React.lazy(() => import('./pages/finance/Finance'));
const Bills = React.lazy(() => import('./pages/finance/Bills'));
const Invoices = React.lazy(() => import('./pages/finance/Invoices'));
const FinancialReports = React.lazy(() => import('./pages/finance/reports/FinancialReports'));
const Customers = React.lazy(() => import('./pages/Customers'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Inventory = React.lazy(() => import('./pages/inventory/Inventory'));
const Products = React.lazy(() => import('./pages/inventory/Products'));
const PurchaseOrders = React.lazy(() => import('./pages/inventory/PurchaseOrders').then(module => ({ default: module.PurchaseOrders })));
const Suppliers = React.lazy(() => import('./pages/inventory/Suppliers'));

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
