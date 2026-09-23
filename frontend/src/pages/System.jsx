import { Link } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';

export function NotFound() {
  return (
    <div className="mx-auto max-w-md text-center">
      <PageHeader title="Page not found" description="The page you are looking for does not exist or was moved." />
      <Link to="/" className="inline-flex h-10 items-center rounded bg-brand-700 px-4 text-sm font-medium text-white no-underline hover:bg-brand-800 hover:text-white hover:no-underline">
        Back to home
      </Link>
    </div>
  );
}

export function Unauthorized() {
  return (
    <div className="mx-auto max-w-md text-center">
      <PageHeader title="Not authorized" description="Your account does not have permission to view this page." />
      <Link to="/dashboard" className="inline-flex h-10 items-center rounded border border-stone-300 bg-white px-4 text-sm font-medium no-underline hover:bg-stone-50 hover:no-underline">
        Back to dashboard
      </Link>
    </div>
  );
}
