import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppShell from '../layouts/AppShell';
import { LoadingBlock } from '../components/ui/States';
import { RequireAuth, RequireRole } from './guards';

// ─── Eager-load public pages (fast initial render) ────────────────────────────
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import { NotFound, Unauthorized } from '../pages/System';

// ─── Lazy-load authenticated feature pages ────────────────────────────────────
const Dashboard          = lazy(() => import('../pages/Dashboard'));
const Account            = lazy(() => import('../pages/Account'));
const Profile            = lazy(() => import('../pages/Profile'));
const Addresses          = lazy(() => import('../pages/Addresses'));
const ProviderProfile    = lazy(() => import('../pages/ProviderProfile'));
const ProviderAvailability = lazy(() => import('../pages/ProviderAvailability'));
const PublicProvider     = lazy(() => import('../pages/PublicProvider'));
const Providers          = lazy(() => import('../pages/Providers'));
const Requests           = lazy(() => import('../pages/Requests'));
const NewRequest         = lazy(() => import('../pages/NewRequest'));
const RequestDetail      = lazy(() => import('../pages/RequestDetail'));
const EditRequest        = lazy(() => import('../pages/EditRequest'));
const ProviderRequests   = lazy(() => import('../pages/ProviderRequests'));
const ProviderQuotes     = lazy(() => import('../pages/ProviderQuotes'));
const ProviderJobs       = lazy(() => import('../pages/ProviderJobs'));
const Bookings           = lazy(() => import('../pages/Bookings'));
const BookingDetail      = lazy(() => import('../pages/BookingDetail'));
const Invoices           = lazy(() => import('../pages/Invoices'));
const InvoiceDetail      = lazy(() => import('../pages/InvoiceDetail'));
const Notifications      = lazy(() => import('../pages/Notifications'));
const ProviderReviews    = lazy(() => import('../pages/ProviderReviews'));
const Disputes           = lazy(() => import('../pages/Disputes'));
const DisputeDetail      = lazy(() => import('../pages/DisputeDetail'));
const NewDispute         = lazy(() => import('../pages/NewDispute'));

// ─── Admin pages (heaviest — always split) ────────────────────────────────────
const CatalogAdmin       = lazy(() => import('../pages/admin/CatalogAdmin'));
const ProvidersAdmin     = lazy(() => import('../pages/admin/ProvidersAdmin'));
const UsersAdmin         = lazy(() => import('../pages/admin/UsersAdmin'));
const BookingsAdmin      = lazy(() => import('../pages/admin/BookingsAdmin'));
const AdminStats         = lazy(() => import('../pages/admin/AdminStats'));
const OperationsQueue    = lazy(() => import('../pages/admin/OperationsQueue'));
const FeeConfig          = lazy(() => import('../pages/admin/FeeConfig'));
const AuditLogs          = lazy(() => import('../pages/admin/AuditLogs'));

function PageSuspense({ children }) {
  return (
    <Suspense
      fallback={
        <div className="py-12">
          <LoadingBlock title="Loading page" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Public */}
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />

        {/* Authenticated — general */}
        <Route
          path="dashboard"
          element={
            <RequireAuth>
              <PageSuspense><Dashboard /></PageSuspense>
            </RequireAuth>
          }
        />
        <Route
          path="account"
          element={
            <RequireAuth>
              <PageSuspense><Account /></PageSuspense>
            </RequireAuth>
          }
        />
        <Route
          path="account/profile"
          element={
            <RequireAuth>
              <PageSuspense><Profile /></PageSuspense>
            </RequireAuth>
          }
        />
        <Route
          path="account/addresses"
          element={
            <RequireAuth>
              <PageSuspense><Addresses /></PageSuspense>
            </RequireAuth>
          }
        />

        {/* Provider routes */}
        <Route
          path="provider/profile"
          element={
            <RequireRole roles={['PROVIDER']}>
              <PageSuspense><ProviderProfile /></PageSuspense>
            </RequireRole>
          }
        />
        <Route
          path="provider/requests"
          element={
            <RequireRole roles={['PROVIDER']}>
              <PageSuspense><ProviderRequests /></PageSuspense>
            </RequireRole>
          }
        />
        <Route
          path="provider/quotes"
          element={
            <RequireRole roles={['PROVIDER']}>
              <PageSuspense><ProviderQuotes /></PageSuspense>
            </RequireRole>
          }
        />
        <Route
          path="provider/availability"
          element={
            <RequireRole roles={['PROVIDER']}>
              <PageSuspense><ProviderAvailability /></PageSuspense>
            </RequireRole>
          }
        />
        <Route
          path="provider/jobs"
          element={
            <RequireRole roles={['PROVIDER']}>
              <PageSuspense><ProviderJobs /></PageSuspense>
            </RequireRole>
          }
        />

        {/* Public provider pages */}
        <Route path="providers/:id" element={<PageSuspense><PublicProvider /></PageSuspense>} />
        <Route path="providers" element={<PageSuspense><Providers /></PageSuspense>} />

        {/* Booking routes */}
        <Route
          path="bookings"
          element={
            <RequireAuth>
              <PageSuspense><Bookings /></PageSuspense>
            </RequireAuth>
          }
        />
        <Route
          path="bookings/:id"
          element={
            <RequireAuth>
              <PageSuspense><BookingDetail /></PageSuspense>
            </RequireAuth>
          }
        />

        {/* Service request routes */}
        <Route
          path="requests"
          element={
            <RequireAuth>
              <PageSuspense><Requests /></PageSuspense>
            </RequireAuth>
          }
        />
        <Route
          path="requests/new"
          element={
            <RequireRole roles={['CUSTOMER']}>
              <PageSuspense><NewRequest /></PageSuspense>
            </RequireRole>
          }
        />
        <Route
          path="requests/:id"
          element={
            <RequireAuth>
              <PageSuspense><RequestDetail /></PageSuspense>
            </RequireAuth>
          }
        />
        <Route
          path="requests/:id/edit"
          element={
            <RequireRole roles={['CUSTOMER']}>
              <PageSuspense><EditRequest /></PageSuspense>
            </RequireRole>
          }
        />

        {/* Admin routes */}
        <Route
          path="admin/catalog"
          element={
            <RequireRole roles={['ADMIN']}>
              <PageSuspense><CatalogAdmin /></PageSuspense>
            </RequireRole>
          }
        />
        <Route
          path="admin/providers"
          element={
            <RequireRole roles={['ADMIN']}>
              <PageSuspense><ProvidersAdmin /></PageSuspense>
            </RequireRole>
          }
        />
        <Route
          path="admin/users"
          element={
            <RequireRole roles={['ADMIN']}>
              <PageSuspense><UsersAdmin /></PageSuspense>
            </RequireRole>
          }
        />
        <Route
          path="admin/bookings"
          element={
            <RequireRole roles={['OPERATIONS', 'ADMIN']}>
              <PageSuspense><BookingsAdmin /></PageSuspense>
            </RequireRole>
          }
        />
        <Route
          path="admin/stats"
          element={
            <RequireRole roles={['OPERATIONS', 'ADMIN']}>
              <PageSuspense><AdminStats /></PageSuspense>
            </RequireRole>
          }
        />
        <Route
          path="admin/operations"
          element={
            <RequireRole roles={['OPERATIONS', 'ADMIN']}>
              <PageSuspense><OperationsQueue /></PageSuspense>
            </RequireRole>
          }
        />
        <Route
          path="admin/fee-config"
          element={
            <RequireRole roles={['ADMIN']}>
              <PageSuspense><FeeConfig /></PageSuspense>
            </RequireRole>
          }
        />
        <Route
          path="admin/audit-logs"
          element={
            <RequireRole roles={['ADMIN']}>
              <PageSuspense><AuditLogs /></PageSuspense>
            </RequireRole>
          }
        />

        {/* Invoices & Notifications */}
        <Route
          path="invoices"
          element={<RequireAuth><PageSuspense><Invoices /></PageSuspense></RequireAuth>}
        />
        <Route
          path="invoices/:id"
          element={<RequireAuth><PageSuspense><InvoiceDetail /></PageSuspense></RequireAuth>}
        />
        <Route
          path="notifications"
          element={<RequireAuth><PageSuspense><Notifications /></PageSuspense></RequireAuth>}
        />

        {/* Reviews & Disputes */}
        <Route path="providers/:id/reviews" element={<PageSuspense><ProviderReviews /></PageSuspense>} />
        <Route
          path="disputes"
          element={<RequireAuth><PageSuspense><Disputes /></PageSuspense></RequireAuth>}
        />
        <Route
          path="disputes/new"
          element={<RequireAuth><PageSuspense><NewDispute /></PageSuspense></RequireAuth>}
        />
        <Route
          path="disputes/:id"
          element={<RequireAuth><PageSuspense><DisputeDetail /></PageSuspense></RequireAuth>}
        />

        <Route path="unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
