import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { LoadingBlock } from '../components/ui/States';

export function RequireAuth({ children }) {
  const token = useSelector((s) => s.auth.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export function RequireRole({ roles, children }) {
  const { token, user } = useSelector((s) => s.auth);
  if (!token) return <Navigate to="/login" replace />;
  // Token present but /auth/me has not resolved yet: hold on a loader
  // instead of rendering role-gated content to the wrong role.
  if (!user) return <LoadingBlock title="Checking access" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
}
