const request = require('supertest');
const { createApp } = require('../src/app');
const { AuditLog } = require('../src/models/AuditLog');
const { startDb, stopDb, clearDb, apiRegister, setRole } = require('./helpers');

let mongo;
let app;

beforeAll(async () => {
  mongo = await startDb();
  app = createApp();
}, 180000);

beforeEach(clearDb);
afterAll(async () => stopDb(mongo));

async function getStaffToken(role = 'SUPPORT') {
  const email = `staff-${role}-${Date.now()}-${Math.random().toString(16).slice(2)}@ex.com`;
  await apiRegister(request, app, { email, role: 'CUSTOMER' });
  await setRole(email, role);
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: 'TestPass1!' })
    .expect(200);
  return { token: login.body.data.token, user: login.body.data.user };
}

const ticketPayload = {
  subject: 'Provider never arrived for the scheduled visit',
  description: 'The provider did not show up for the confirmed morning appointment and never called to explain.',
  category: 'BOOKING_ISSUE',
  priority: 'HIGH',
};

describe('Support Tickets API', () => {
  it('customer can raise a ticket', async () => {
    const cust = await apiRegister(request, app, { email: 't-cust@ex.com', role: 'CUSTOMER' });
    const res = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${cust.token}`)
      .send(ticketPayload);

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('OPEN');
    expect(res.body.data.priority).toBe('HIGH');
    expect(res.body.data.messages).toHaveLength(1);
  });

  it('validation rejects short subjects and descriptions', async () => {
    const cust = await apiRegister(request, app, { email: 't-cust2@ex.com', role: 'CUSTOMER' });
    const res = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${cust.token}`)
      .send({ subject: 'Hi', description: 'Too short' });
    expect(res.status).toBe(400);
  });

  it('customers only see their own tickets; staff see the queue', async () => {
    const custA = await apiRegister(request, app, { email: 't-a@ex.com', role: 'CUSTOMER' });
    const custB = await apiRegister(request, app, { email: 't-b@ex.com', role: 'CUSTOMER' });
    const staff = await getStaffToken();

    await request(app).post('/api/v1/tickets').set('Authorization', `Bearer ${custA.token}`).send(ticketPayload).expect(201);

    const ownB = await request(app).get('/api/v1/tickets').set('Authorization', `Bearer ${custB.token}`).expect(200);
    expect(ownB.body.data.tickets).toHaveLength(0);

    const queue = await request(app).get('/api/v1/tickets').set('Authorization', `Bearer ${staff.token}`).expect(200);
    expect(queue.body.data.tickets).toHaveLength(1);

    // Stranger cannot open someone else's ticket
    const ticketId = queue.body.data.tickets[0]._id;
    await request(app).get(`/api/v1/tickets/${ticketId}`).set('Authorization', `Bearer ${custB.token}`).expect(404);
  });

  it('staff triage: assign, prioritize, resolve; invalid transitions rejected', async () => {
    const cust = await apiRegister(request, app, { email: 't-c@ex.com', role: 'CUSTOMER' });
    const staff = await getStaffToken();
    const other = await getStaffToken('OPERATIONS');

    const created = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${cust.token}`)
      .send(ticketPayload)
      .expect(201);
    const ticketId = created.body.data._id;

    // Open -> Resolved directly is not allowed
    await request(app)
      .patch(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ status: 'RESOLVED' })
      .expect(422);

    // Assign to a staff member + move to IN_PROGRESS
    const assigned = await request(app)
      .patch(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ status: 'IN_PROGRESS', priority: 'URGENT', assignedTo: staff.user.id })
      .expect(200);
    expect(assigned.body.data.status).toBe('IN_PROGRESS');
    expect(assigned.body.data.priority).toBe('URGENT');

    // Cannot assign to a non-staff account
    await request(app)
      .patch(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ assignedTo: created.body.data.raisedBy })
      .expect(422);

    // Resolve
    const resolved = await request(app)
      .patch(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${other.token}`)
      .send({ status: 'RESOLVED', resolutionNote: 'Rebooked the visit for tomorrow morning.' })
      .expect(200);
    expect(resolved.body.data.status).toBe('RESOLVED');
    expect(resolved.body.data.resolutionNote).toBeTruthy();
    expect(resolved.body.data.resolvedAt).toBeTruthy();

    // Non-staff cannot triage
    await request(app)
      .patch(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${cust.token}`)
      .send({ status: 'CLOSED' })
      .expect(403);
  });

  it('raiser and staff can converse; closed tickets reject messages', async () => {
    const cust = await apiRegister(request, app, { email: 't-chat@ex.com', role: 'CUSTOMER' });
    const staff = await getStaffToken();

    const created = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${cust.token}`)
      .send(ticketPayload)
      .expect(201);
    const ticketId = created.body.data._id;

    await request(app)
      .patch(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ status: 'IN_PROGRESS', assignedTo: staff.user.id })
      .expect(200);

    await request(app)
      .post(`/api/v1/tickets/${ticketId}/messages`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ body: 'Could you confirm whether the gate code changed?' })
      .expect(200);

    const afterUser = await request(app)
      .post(`/api/v1/tickets/${ticketId}/messages`)
      .set('Authorization', `Bearer ${cust.token}`)
      .send({ body: 'Yes — the new code is 4410, please call on arrival.' })
      .expect(200);
    expect(afterUser.body.data.messages).toHaveLength(3);

    // Close, then verify messages are rejected
    await request(app)
      .patch(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ status: 'RESOLVED', resolutionNote: 'Done.' })
      .expect(200);
    await request(app)
      .patch(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ status: 'CLOSED' })
      .expect(200);
    await request(app)
      .post(`/api/v1/tickets/${ticketId}/messages`)
      .set('Authorization', `Bearer ${cust.token}`)
      .send({ body: 'One more thing.' })
      .expect(422);
  });

  it('writes an audit entry on status change', async () => {
    const cust = await apiRegister(request, app, { email: 't-audit@ex.com', role: 'CUSTOMER' });
    const staff = await getStaffToken();
    const created = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${cust.token}`)
      .send(ticketPayload)
      .expect(201);

    await request(app)
      .patch(`/api/v1/tickets/${created.body.data._id}`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(200);

    const events = await AuditLog.find({ action: 'TICKET_STATUS_CHANGE' }).lean();
    expect(events).toHaveLength(1);
    expect(events[0].before.status).toBe('OPEN');
    expect(events[0].after.status).toBe('IN_PROGRESS');
  });
});
