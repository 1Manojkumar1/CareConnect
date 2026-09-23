import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export function RequireAuth({ children }) {
  const token = useSelector((s) => s.auth.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export function RequireRole({ roles, children }) {
  const { token, user } = useSelector((s) => s.auth);
  if (!token) return <Navigate to="/login" replace />;
  // Until Phase 3 populates user/role from /me, allow dashboard shell through;
  // backend remains the security boundary for all protected APIs.
  if (user && roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
}
