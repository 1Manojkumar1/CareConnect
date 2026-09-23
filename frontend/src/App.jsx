import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { logout, setUser } from './store/authSlice';
import { pushToast } from './store/uiSlice';
import { store } from './store/store';
import api from './lib/api';
import AppRoutes from './routes/AppRoutes';

function SessionBridge() {
  const dispatch = useDispatch();
  useEffect(() => {
    const onExpired = () => {
      dispatch(logout());
      dispatch(
        pushToast({ tone: 'warning', message: 'Your session expired. Please sign in again.' })
      );
      window.location.assign('/login');
    };
    window.addEventListener('cc:session-expired', onExpired);
    return () => window.removeEventListener('cc:session-expired', onExpired);
  }, [dispatch]);

  // Hydrate the session: token without user (e.g. page reload) → GET /me.
  useEffect(() => {
    const state = store.getState();
    if (!state.auth.token || state.auth.user) return;
    let cancelled = false;
    api
      .get('/auth/me')
      .then((res) => {
        if (!cancelled) dispatch(setUser(res.data.data.user));
      })
      .catch(() => {
        if (!cancelled) dispatch(logout());
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return null;
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <SessionBridge />
        <AppRoutes />
      </BrowserRouter>
    </Provider>
  );
}
