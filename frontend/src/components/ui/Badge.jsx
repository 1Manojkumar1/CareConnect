import { STATUS_TONE, formatStatus } from '../../lib/status';

const tones = {
  neutral: 'bg-stone-100 text-stone-700 border-stone-200',
  info: 'bg-sky-50 text-sky-800 border-sky-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-red-50 text-red-800 border-red-200',
};

export default function Badge({ tone = 'neutral', status, children, className = '' }) {
  const resolved = status ? STATUS_TONE[status] || 'neutral' : tone;
  const label = status ? formatStatus(status) : children;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium ${tones[resolved]} ${className}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
