import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { getApiErrorMessage } from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import { LoadingBlock, ErrorBlock } from '../components/ui/States';

export default function PublicProvider() {
  const { id } = useParams();
  const [provider, setProvider] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get(`/providers/${id}`),
      api.get(`/availability/providers/${id}/schedule`).catch(() => ({ data: { data: null } })),
    ])
      .then(([pRes, sRes]) => {
        if (!cancelled) {
          setProvider(pRes.data.data);
          setSchedule(sRes.data?.data);
          setState('success');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'Provider not found.'));
          setState('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const DAYS_MAP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="mx-auto max-w-3xl">
      {state === 'loading' && <LoadingBlock title="Loading provider" />}
      {state === 'error' && (
        <ErrorBlock title="Provider not available" description={error} />
      )}
      {state === 'success' && provider && (
        <div>
          <PageHeader
            title={provider.headline || provider.user.name}
            description={provider.bio}
            breadcrumb={<Link to="/">Home</Link>}
          />
          <div className="grid gap-4">
            <Card title={provider.user.name} description={`${provider.experienceYears} yrs experience`}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge status="VERIFIED" />
                {provider.acceptingJobs ? <Badge tone="success">Accepting jobs</Badge> : <Badge tone="neutral">Not accepting jobs</Badge>}
                {provider.ratingCount > 0 && <span className="text-sm text-ink-muted">★ {provider.ratingAvg.toFixed(1)} ({provider.ratingCount})</span>}
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-ink-faint">Categories</dt>
                  <dd className="mt-1">{provider.categories.map((c) => c.name).join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt className="text-ink-faint">Skills</dt>
                  <dd className="mt-1">{provider.skills.map((s) => s.name).join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt className="text-ink-faint">Service areas</dt>
                  <dd className="mt-1">{provider.serviceAreas.map((a) => a.city).join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt className="text-ink-faint">Pricing</dt>
                  <dd className="mt-1">
                    ${provider.pricing.hourlyRate}/hr{provider.pricing.visitFee > 0 && ` · $${provider.pricing.visitFee} visit fee`}
                  </dd>
                </div>
              </dl>
            </Card>

            {schedule?.workingHours && (
              <Card
                title="Operating Hours & Schedule"
                description={`Provider timezone: ${schedule.timezone || 'UTC'}`}
              >
                <div className="divide-y divide-stone-100 text-xs">
                  {schedule.workingHours.map((d) => (
                    <div key={d.dayOfWeek} className="flex items-center justify-between py-2">
                      <span className="font-medium text-ink w-28">{DAYS_MAP[d.dayOfWeek]}</span>
                      {d.isOpen ? (
                        <div className="flex items-center gap-2 text-ink-muted">
                          <span>
                            {d.ranges?.map((r) => `${r.start} – ${r.end}`).join(', ') || 'Open'}
                          </span>
                          <Badge tone="success">Open</Badge>
                        </div>
                      ) : (
                        <Badge tone="neutral">Closed</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
