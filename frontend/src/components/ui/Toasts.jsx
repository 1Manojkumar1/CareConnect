import { useDispatch, useSelector } from 'react-redux';
import { dismissToast } from '../../store/uiSlice';

const tones = {
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-red-200 bg-red-50 text-red-900',
};

export default function Toasts() {
  const toasts = useSelector((s) => s.ui.toasts);
  const dispatch = useDispatch();
  if (toasts.length === 0) return null;
  return (
    <div aria-live="polite" className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} role="status" className={`rounded-lg border px-4 py-3 text-sm shadow-card ${tones[t.tone] || tones.info}`}>
          <div className="flex items-start justify-between gap-3">
            <p>{t.message}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dispatch(dismissToast(t.id))}
              className="font-semibold opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
