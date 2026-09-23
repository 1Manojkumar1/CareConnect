import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { pushToast } from '../store/uiSlice';
import api, { getApiErrorMessage } from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Alert from '../components/ui/Alert';
import Modal from '../components/ui/Modal';
import { LoadingBlock, ErrorBlock, EmptyState } from '../components/ui/States';

const DAYS = [
  { day: 1, name: 'Monday' },
  { day: 2, name: 'Tuesday' },
  { day: 3, name: 'Wednesday' },
  { day: 4, name: 'Thursday' },
  { day: 5, name: 'Friday' },
  { day: 6, name: 'Saturday' },
  { day: 0, name: 'Sunday' },
];

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Kolkata',
  'Australia/Sydney',
];

export default function ProviderAvailability() {
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [timezone, setTimezone] = useState('UTC');
  const [acceptingJobs, setAcceptingJobs] = useState(true);
  const [workingHours, setWorkingHours] = useState([]);
  const [slots, setSlots] = useState([]);
  const [slotModal, setSlotModal] = useState(false);
  const [slotForm, setSlotForm] = useState({
    startAt: '',
    endAt: '',
    reason: '',
    kind: 'BLOCKED',
  });
  const [slotError, setSlotError] = useState('');
  const [slotSaving, setSlotSaving] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [schedRes, slotsRes] = await Promise.all([
          api.get('/availability/schedule'),
          api.get('/availability/slots'),
        ]);
        if (cancelled) return;
        const sched = schedRes.data.data;
        setTimezone(sched.timezone || 'UTC');
        setAcceptingJobs(sched.acceptingJobs !== false);
        setWorkingHours(sched.workingHours || []);
        setSlots(slotsRes.data.data || []);
        setState('success');
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, 'Could not load your availability settings.'));
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function handleDayToggle(dayOfWeek) {
    setWorkingHours((prev) =>
      prev.map((item) => {
        if (item.dayOfWeek !== dayOfWeek) return item;
        const willBeOpen = !item.isOpen;
        return {
          ...item,
          isOpen: willBeOpen,
          ranges: willBeOpen && (!item.ranges || item.ranges.length === 0)
            ? [{ start: '09:00', end: '17:00' }]
            : item.ranges,
        };
      })
    );
  }

  function handleRangeChange(dayOfWeek, rangeIndex, field, value) {
    setWorkingHours((prev) =>
      prev.map((item) => {
        if (item.dayOfWeek !== dayOfWeek) return item;
        const newRanges = [...(item.ranges || [])];
        newRanges[rangeIndex] = { ...newRanges[rangeIndex], [field]: value };
        return { ...item, ranges: newRanges };
      })
    );
  }

  function applyPreset(type) {
    let newHours = [];
    if (type === 'WEEKDAYS_9_5') {
      newHours = [
        { dayOfWeek: 1, isOpen: true, ranges: [{ start: '09:00', end: '17:00' }] },
        { dayOfWeek: 2, isOpen: true, ranges: [{ start: '09:00', end: '17:00' }] },
        { dayOfWeek: 3, isOpen: true, ranges: [{ start: '09:00', end: '17:00' }] },
        { dayOfWeek: 4, isOpen: true, ranges: [{ start: '09:00', end: '17:00' }] },
        { dayOfWeek: 5, isOpen: true, ranges: [{ start: '09:00', end: '17:00' }] },
        { dayOfWeek: 6, isOpen: false, ranges: [] },
        { dayOfWeek: 0, isOpen: false, ranges: [] },
      ];
    } else if (type === 'EXTENDED_8_6') {
      newHours = [
        { dayOfWeek: 1, isOpen: true, ranges: [{ start: '08:00', end: '18:00' }] },
        { dayOfWeek: 2, isOpen: true, ranges: [{ start: '08:00', end: '18:00' }] },
        { dayOfWeek: 3, isOpen: true, ranges: [{ start: '08:00', end: '18:00' }] },
        { dayOfWeek: 4, isOpen: true, ranges: [{ start: '08:00', end: '18:00' }] },
        { dayOfWeek: 5, isOpen: true, ranges: [{ start: '08:00', end: '18:00' }] },
        { dayOfWeek: 6, isOpen: true, ranges: [{ start: '09:00', end: '15:00' }] },
        { dayOfWeek: 0, isOpen: false, ranges: [] },
      ];
    }
    setWorkingHours(newHours);
    dispatch(pushToast({ tone: 'info', message: 'Preset applied. Click Save Changes to confirm.' }));
  }

  async function handleSaveSchedule(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/availability/schedule', {
        workingHours,
        timezone,
        acceptingJobs,
      });
      dispatch(pushToast({ tone: 'success', message: 'Availability schedule saved.' }));
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Failed to save schedule.') }));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateSlot(e) {
    e.preventDefault();
    setSlotError('');
    if (!slotForm.startAt || !slotForm.endAt) {
      setSlotError('Both start and end date/times are required.');
      return;
    }
    if (new Date(slotForm.startAt) >= new Date(slotForm.endAt)) {
      setSlotError('Start time must be strictly earlier than end time.');
      return;
    }

    setSlotSaving(true);
    try {
      const res = await api.post('/availability/slots', {
        startAt: new Date(slotForm.startAt).toISOString(),
        endAt: new Date(slotForm.endAt).toISOString(),
        reason: slotForm.reason,
        kind: slotForm.kind,
      });
      setSlots((prev) => [...prev, res.data.data]);
      setSlotModal(false);
      setSlotForm({ startAt: '', endAt: '', reason: '', kind: 'BLOCKED' });
      dispatch(pushToast({ tone: 'success', message: 'Unavailable period scheduled.' }));
    } catch (err) {
      setSlotError(getApiErrorMessage(err, 'Failed to block time period.'));
    } finally {
      setSlotSaving(false);
    }
  }

  async function handleDeleteSlot(id) {
    if (!window.confirm('Are you sure you want to remove this unavailable period?')) return;
    try {
      await api.delete(`/availability/slots/${id}`);
      setSlots((prev) => prev.filter((s) => s.id !== id));
      dispatch(pushToast({ tone: 'success', message: 'Time-off period removed.' }));
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not delete slot.') }));
    }
  }

  if (state === 'loading') return <LoadingBlock message="Loading availability settings..." />;
  if (state === 'error') {
    return (
      <ErrorBlock
        message={error}
        onRetry={() => {
          setState('loading');
          setReloadKey((k) => k + 1);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Availability and Scheduling"
        description="Set your regular working hours, manage scheduled time off, and prevent double booking."
        breadcrumb={<span>Provider · Availability</span>}
        actions={
          <Button
            variant="primary"
            onClick={handleSaveSchedule}
            disabled={saving}
          >
            {saving ? 'Saving changes...' : 'Save Changes'}
          </Button>
        }
      />

      {/* Master Controls Banner */}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="acceptingJobsToggle"
              checked={acceptingJobs}
              onChange={(e) => setAcceptingJobs(e.target.checked)}
              className="h-5 w-5 rounded border-stone-300 accent-teal-800"
            />
            <div>
              <label htmlFor="acceptingJobsToggle" className="cursor-pointer font-medium text-ink">
                Accepting new bookings
              </label>
              <p className="text-xs text-ink-muted">
                {acceptingJobs
                  ? 'You are active and visible in search recommendations.'
                  : 'New booking requests are temporarily paused.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="tzSelect" className="text-xs font-semibold text-ink-muted">
              Timezone:
            </label>
            <select
              id="tzSelect"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="h-9 rounded border border-stone-300 bg-white px-3 text-xs text-ink focus:border-teal-700 focus:outline-none"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Weekly Working Hours */}
        <div className="space-y-4 lg:col-span-2">
          <Card
            title="Weekly Operating Hours"
            description="Customers will only be allowed to book time slots within your specified open hours."
          >
            <div className="mb-4 flex flex-wrap gap-2 border-b border-stone-100 pb-3">
              <span className="text-xs font-medium text-ink-muted self-center">Quick presets:</span>
              <button
                type="button"
                onClick={() => applyPreset('WEEKDAYS_9_5')}
                className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-xs font-medium text-ink hover:bg-stone-100"
              >
                Mon–Fri 9am–5pm
              </button>
              <button
                type="button"
                onClick={() => applyPreset('EXTENDED_8_6')}
                className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-xs font-medium text-ink hover:bg-stone-100"
              >
                Mon–Sat Extended
              </button>
            </div>

            <div className="divide-y divide-stone-100">
              {DAYS.map(({ day, name }) => {
                const config = workingHours.find((d) => d.dayOfWeek === day) || {
                  dayOfWeek: day,
                  isOpen: false,
                  ranges: [],
                };
                const range = config.ranges?.[0] || { start: '09:00', end: '17:00' };

                return (
                  <div
                    key={day}
                    className={`flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between ${
                      !config.isOpen ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:w-36">
                      <input
                        type="checkbox"
                        id={`day-${day}`}
                        checked={config.isOpen}
                        onChange={() => handleDayToggle(day)}
                        className="h-4 w-4 rounded border-stone-300 accent-teal-800"
                      />
                      <label htmlFor={`day-${day}`} className="cursor-pointer text-sm font-semibold text-ink">
                        {name}
                      </label>
                    </div>

                    {config.isOpen ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={range.start}
                          onChange={(e) => handleRangeChange(day, 0, 'start', e.target.value)}
                          className="h-9 w-28 text-xs"
                        />
                        <span className="text-xs text-ink-muted">to</span>
                        <Input
                          type="time"
                          value={range.end}
                          onChange={(e) => handleRangeChange(day, 0, 'end', e.target.value)}
                          className="h-9 w-28 text-xs"
                        />
                        <Badge tone="success" className="ml-2">Open</Badge>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Badge tone="neutral">Closed</Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Unavailable Periods / Time Off */}
        <div className="space-y-4">
          <Card
            title="Scheduled Time Off"
            description="Block specific days or hours for vacations, appointments, or holidays."
          >
            <div className="mb-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSlotModal(true)}
                className="w-full"
              >
                + Schedule Time Off
              </Button>
            </div>

            {slots.length === 0 ? (
              <EmptyState
                title="No blocked periods"
                description="When you take time off or need maintenance hours, add them here so customers cannot book."
              />
            ) : (
              <div className="space-y-2">
                {slots.map((slot) => {
                  const s = new Date(slot.startAt);
                  const e = new Date(slot.endAt);
                  const dateStr = s.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                  const timeStr = `${s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                  return (
                    <div
                      key={slot.id}
                      className="flex items-start justify-between rounded border border-stone-200 bg-surface p-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-ink">
                          {slot.reason || 'Blocked Time'}
                        </div>
                        <div className="text-ink-muted">{dateStr}</div>
                        <div className="text-ink-faint">{timeStr}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="text-stone-400 hover:text-red-600"
                        title="Remove time-off"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Conflict Protection Notice */}
          <div className="rounded border border-teal-100 bg-teal-50/60 p-4 text-xs text-teal-900">
            <h4 className="font-semibold text-teal-950 mb-1">Automated Conflict Prevention</h4>
            <p>
              CareConnect continuously verifies all incoming requests against your weekly operating hours, active bookings, and scheduled time-off blocks using server-side overlap checks. Double bookings are automatically prevented.
            </p>
          </div>
        </div>
      </div>

      {/* Time-off Modal */}
      {slotModal && (
        <Modal
          title="Schedule Time Off / Unavailable Period"
          onClose={() => setSlotModal(false)}
        >
          <form onSubmit={handleCreateSlot} className="space-y-4">
            {slotError && <Alert tone="danger">{slotError}</Alert>}

            <div>
              <label className="cc-label">Reason / Notes</label>
              <Input
                type="text"
                placeholder="e.g. Vacation, Doctor appointment, Van repairs"
                value={slotForm.reason}
                onChange={(e) => setSlotForm({ ...slotForm, reason: e.target.value })}
                maxLength={200}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="cc-label">Start Date & Time</label>
                <Input
                  type="datetime-local"
                  required
                  value={slotForm.startAt}
                  onChange={(e) => setSlotForm({ ...slotForm, startAt: e.target.value })}
                />
              </div>
              <div>
                <label className="cc-label">End Date & Time</label>
                <Input
                  type="datetime-local"
                  required
                  value={slotForm.endAt}
                  onChange={(e) => setSlotForm({ ...slotForm, endAt: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setSlotModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={slotSaving}>
                {slotSaving ? 'Scheduling...' : 'Save Period'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
