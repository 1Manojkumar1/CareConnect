import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/store-helpers';
import { getUnreadCount } from '../lib/notifications';
import Toasts from '../components/ui/Toasts';

function navClass({ isActive }) {
  return `rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors ${
    isActive
      ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-200'
      : 'text-ink-muted hover:bg-stone-100 hover:text-ink'
  }`;
}

// ─── Logo ──────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 no-underline hover:no-underline group" aria-label="CareConnect home">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-[13px] font-bold text-white shadow-sm transition-transform group-hover:scale-105"
      >
        CC
      </span>
      <span className="text-[15px] font-semibold text-ink tracking-tight">CareConnect</span>
    </Link>
  );
}

// ─── Bell icon ─────────────────────────────────────────────────────────────
function NotificationBell({ count }) {
  return (
    <Link
      to="/notifications"
      className="relative rounded-full p-2 text-ink-faint transition-colors hover:bg-stone-100 hover:text-ink"
      aria-label={count > 0 ? `Notifications (${count} unread)` : 'Notifications'}
    >
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

// ─── User menu ─────────────────────────────────────────────────────────────
function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = (user?.name || user?.email || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-stone-100 hover:text-ink"
        aria-expanded={open}
        aria-haspopup="true"
        id="user-menu-button"
      >
        <span
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-800"
        >
          {initials}
        </span>
        <span className="hidden sm:block max-w-[100px] truncate">{user?.name || user?.email}</span>
        <svg className="hidden sm:block h-3.5 w-3.5 text-ink-faint" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-labelledby="user-menu-button"
          className="absolute right-0 top-full z-50 mt-1.5 w-48 rounded-lg border border-stone-200 bg-surface shadow-card focus:outline-none"
        >
          <div className="border-b border-stone-100 px-4 py-2.5">
            <p className="text-[13px] font-medium text-ink truncate">{user?.name || 'Account'}</p>
            <p className="text-[12px] text-ink-faint truncate">{user?.email}</p>
          </div>
          <div className="py-1">
            <Link
              to="/account"
              role="menuitem"
              className="block px-4 py-2 text-sm text-ink no-underline transition-colors hover:bg-stone-50 hover:no-underline"
              onClick={() => setOpen(false)}
            >
              Account settings
            </Link>
            <Link
              to="/dashboard"
              role="menuitem"
              className="block px-4 py-2 text-sm text-ink no-underline transition-colors hover:bg-stone-50 hover:no-underline"
              onClick={() => setOpen(false)}
            >
              Dashboard
            </Link>
          </div>
          <div className="border-t border-stone-100 py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); onLogout(); }}
              className="w-full px-4 py-2 text-left text-sm text-red-700 transition-colors hover:bg-red-50"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Primary nav links ─────────────────────────────────────────────────────
function PrimaryNav({ token, user }) {
  const role = user?.role;
  return (
    <>
      <NavLink to="/" className={navClass} end>Home</NavLink>
      <NavLink to="/providers" className={navClass}>Providers</NavLink>
      {token && <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>}
      {token && role === 'CUSTOMER' && (
        <>
          <NavLink to="/requests" className={navClass}>Requests</NavLink>
          <NavLink to="/bookings" className={navClass}>Bookings</NavLink>
        </>
      )}
      {token && role === 'PROVIDER' && (
        <>
          <NavLink to="/provider/jobs" className={navClass}>Jobs</NavLink>
          <NavLink to="/provider/requests" className={navClass}>Requests</NavLink>
          <NavLink to="/provider/availability" className={navClass}>Availability</NavLink>
        </>
      )}
      {token && ['OPERATIONS', 'ADMIN'].includes(role) && (
        <>
          <NavLink to="/admin/stats" className={navClass}>Stats</NavLink>
          <NavLink to="/admin/operations" className={navClass}>Operations</NavLink>
          <NavLink to="/admin/bookings" className={navClass}>Bookings</NavLink>
        </>
      )}
      {token && role === 'ADMIN' && (
        <>
          <NavLink to="/admin/users" className={navClass}>Users</NavLink>
          <NavLink to="/admin/audit-logs" className={navClass}>Audit</NavLink>
        </>
      )}
      {token && <NavLink to="/invoices" className={navClass}>Invoices</NavLink>}
    </>
  );
}

export default function AppShell() {
  const user = useSelector((s) => s.auth.user);
  const token = useSelector((s) => s.auth.token);
  const [unreadCount, setUnreadCount] = useState(0);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!token) { setUnreadCount(0); return; }
    let mounted = true;
    getUnreadCount()
      .then((count) => { if (mounted) setUnreadCount(count); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [token, location.pathname]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      {/* Skip link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow-card"
      >
        Skip to content
      </a>

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-surface/95 backdrop-blur-sm">
        <div className="cc-container flex h-14 items-center justify-between gap-4">
          <Logo />

          {/* Desktop nav */}
          <nav aria-label="Primary" className="hidden items-center gap-0.5 md:flex">
            <PrimaryNav token={token} user={user} />
          </nav>

          {/* Header actions */}
          <div className="flex items-center gap-1.5">
            {token ? (
              <>
                <NotificationBell count={unreadCount} />
                <UserMenu user={user} onLogout={handleLogout} />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="hidden h-8 items-center rounded-md px-3 text-[13px] font-medium text-ink-muted no-underline transition-colors hover:bg-stone-100 hover:text-ink hover:no-underline sm:inline-flex"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="inline-flex h-8 items-center rounded-md bg-brand-700 px-3 text-[13px] font-medium text-white no-underline shadow-sm transition-colors hover:bg-brand-800 hover:no-underline"
                >
                  Get started
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile nav — horizontal scroll */}
        <nav
          aria-label="Primary mobile"
          className="border-t border-stone-100 bg-surface px-3 py-1.5 md:hidden"
        >
          <div className="flex gap-0.5 overflow-x-auto scrollbar-hide">
            <PrimaryNav token={token} user={user} />
            {token && (
              <NavLink to="/notifications" className={navClass}>
                Alerts {unreadCount > 0 ? `(${unreadCount})` : ''}
              </NavLink>
            )}
            {token && <NavLink to="/account" className={navClass}>Account</NavLink>}
            {!token && (
              <>
                <NavLink to="/login" className={navClass}>Sign in</NavLink>
                <NavLink to="/register" className={navClass}>Register</NavLink>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* ─── Main ───────────────────────────────────────────────────────────── */}
      <main id="main" className="flex-1 py-7">
        <div className="cc-container">
          <Outlet />
        </div>
      </main>

      {/* ─── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-stone-200 bg-surface">
        <div className="cc-container flex flex-col gap-1 py-5 text-[13px] text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-5 w-5 items-center justify-center rounded bg-brand-700 text-[9px] font-bold text-white"
            >
              CC
            </span>
            <p>CareConnect — trusted home services.</p>
          </div>
          <p>Secure · Verified providers · Transparent pricing</p>
        </div>
      </footer>

      <Toasts />
    </div>
  );
}
