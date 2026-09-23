/**
 * Input — accessible, form-integrated text input.
 *
 * Additional props vs. native <input>:
 *   label    — renders a <label> element above
 *   hint     — displays helper text below (hidden when error is present)
 *   error    — displays validation error message (sets aria-invalid)
 *   prefix   — inline prefix text (e.g., '$', 'http://')
 *   suffix   — inline suffix text or icon
 *   required — marks field as required with a visual indicator
 */
export default function Input({ label, hint, error, id, required, prefix, suffix, ...props }) {
  const inputId = id || props.name;
  const hasDecoration = prefix || suffix;

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="cc-label">
          {label}{' '}
          {required && (
            <span aria-hidden="true" className="text-red-600">
              *
            </span>
          )}
        </label>
      )}

      <div className={`relative ${hasDecoration ? 'flex items-stretch' : ''}`}>
        {prefix && (
          <span className="flex items-center rounded-l-lg border border-r-0 border-stone-300 bg-stone-50 px-3 text-sm text-ink-faint select-none">
            {prefix}
          </span>
        )}

        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          className={`
            h-10 w-full bg-white px-3 text-[14px] text-ink placeholder:text-stone-400
            border transition-colors duration-150
            focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20
            disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-ink-faint
            ${prefix ? 'rounded-l-none rounded-r-lg' : suffix ? 'rounded-l-lg rounded-r-none' : 'rounded-lg'}
            ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-stone-300'}
          `}
          {...props}
        />

        {suffix && (
          <span className="flex items-center rounded-r-lg border border-l-0 border-stone-300 bg-stone-50 px-3 text-sm text-ink-faint select-none">
            {suffix}
          </span>
        )}
      </div>

      {error && (
        <p id={`${inputId}-error`} role="alert" className="cc-error-text flex items-center gap-1">
          <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="cc-hint">
          {hint}
        </p>
      )}
    </div>
  );
}
