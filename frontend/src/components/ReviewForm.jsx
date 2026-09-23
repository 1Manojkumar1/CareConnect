import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createReview } from '../lib/reviews';

const schema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().max(2000).optional(),
});

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

export default function ReviewForm({ bookingId, onSuccess, onCancel }) {
  const [hoveredStar, setHoveredStar] = useState(0);
  const [serverErr, setServerErr] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { rating: 0, body: '' } });

  const selectedRating = watch('rating');

  const onSubmit = async (values) => {
    setServerErr('');
    try {
      const review = await createReview({ bookingId, ...values });
      onSuccess?.(review);
    } catch (err) {
      setServerErr(err.response?.data?.error?.message || 'Failed to submit review');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-neutral-900 mb-4">Leave a Review</h3>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Star Rating */}
        <div>
          <label className="cc-label mb-2">Rating</label>
          <div className="flex items-center gap-1 mb-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setValue('rating', star, { shouldValidate: true })}
                className="text-3xl transition-transform hover:scale-110 focus:outline-none"
                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
              >
                <span className={(hoveredStar || selectedRating) >= star ? 'text-amber-400' : 'text-neutral-300'}>
                  ★
                </span>
              </button>
            ))}
            <span className="ml-2 text-sm text-neutral-500">
              {STAR_LABELS[hoveredStar || selectedRating] || 'Select rating'}
            </span>
          </div>
          {errors.rating && <p className="cc-error-text">{errors.rating.message}</p>}
          <input type="hidden" {...register('rating')} />
        </div>

        {/* Review Body */}
        <div>
          <label htmlFor="review-body" className="cc-label">
            Review <span className="text-neutral-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="review-body"
            rows={4}
            {...register('body')}
            placeholder="Share your experience with this provider..."
            className="cc-input resize-none"
          />
          {errors.body && <p className="cc-error-text">{errors.body.message}</p>}
        </div>

        {serverErr && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {serverErr}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          {onCancel && (
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900">
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !selectedRating}
            className="px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Submitting…' : 'Submit Review'}
          </button>
        </div>
      </form>
    </div>
  );
}
