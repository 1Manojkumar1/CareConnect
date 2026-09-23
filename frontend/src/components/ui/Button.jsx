const tones = {
  primary:
    'bg-brand-700 text-white shadow-sm hover:bg-brand-800 active:bg-brand-900 disabled:bg-stone-300 disabled:shadow-none',
  secondary:
    'bg-white text-ink border border-stone-300 hover:bg-stone-50 active:bg-stone-100 disabled:text-stone-400 disabled:border-stone-200',
  danger:
    'bg-red-700 text-white shadow-sm hover:bg-red-800 active:bg-red-900 disabled:bg-stone-300',
  ghost:
    'text-brand-700 hover:bg-brand-50 active:bg-brand-100 disabled:text-stone-400',
  subtle:
    'text-ink-muted bg-stone-100 hover:bg-stone-200 active:bg-stone-300 disabled:text-stone-400',
};

const sizes = {
  xs: 'h-7 px-2.5 text-[12px]',
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-[15px]',
};

/**
 * Button — primary interactive control.
 *
 * Props:
 *   tone     — 'primary' | 'secondary' | 'danger' | 'ghost' | 'subtle'
 *   size     — 'xs' | 'sm' | 'md' | 'lg'
 *   loading  — shows a spinner and disables the button
 *   className — extra Tailwind classes
 */
export default function Button({
  tone = 'primary',
  size = 'md',
  className = '',
  loading = false,
  children,
  ...props
}) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-colors duration-150 ease-in-out
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600
        disabled:cursor-not-allowed
        ${tones[tone] ?? tones.primary}
        ${sizes[size] ?? sizes.md}
        ${className}
      `}
      disabled={loading || props.disabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
