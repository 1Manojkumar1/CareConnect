import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProviderReviews } from '../lib/reviews';

function StarDisplay({ rating }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? 'text-amber-400' : 'text-neutral-300'}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function ProviderReviews() {
  const { id: providerId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!providerId) return;
    setLoading(true);
    getProviderReviews(providerId)
      .then(setData)
      .catch(() => setErr('Could not load reviews'))
      .finally(() => setLoading(false));
  }, [providerId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (err) {
    return (
      <div className="cc-container py-12">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">{err}</div>
      </div>
    );
  }

  const { reviews = [], total = 0 } = data || {};

  return (
    <div className="cc-container py-10">
      <div className="mb-6">
        <Link to={`/providers/${providerId}`} className="text-brand-600 hover:underline text-sm">
          ← Back to Provider
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 mt-2">Provider Reviews</h1>
        <p className="text-neutral-500 text-sm mt-1">{total} review{total !== 1 ? 's' : ''}</p>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-16 text-neutral-400">
          <div className="text-5xl mb-4">⭐</div>
          <p className="text-lg font-medium text-neutral-600">No reviews yet</p>
          <p className="text-sm mt-1">This provider hasn't received any reviews yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review._id} className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-neutral-900">
                    {review.customerId?.name || 'Customer'}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {review.publishedAt
                      ? new Date(review.publishedAt).toLocaleDateString()
                      : new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <StarDisplay rating={review.rating} />
              </div>
              {review.body && (
                <p className="text-neutral-700 text-sm leading-relaxed">{review.body}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
