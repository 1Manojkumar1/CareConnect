const request = require('supertest');
const { createApp } = require('../src/app');
const { User } = require('../src/models/User');
const { startDb, stopDb, clearDb, apiRegister, setRole } = require('./helpers');

let mongo;
let app;

beforeAll(async () => {
  mongo = await startDb();
  app = createApp();
}, 180000);

beforeEach(clearDb);

afterAll(async () => stopDb(mongo));

const ADDRESS = {
  label: 'Home',
  line1: '14 Maple Street',
  city: 'Austin',
  postalCode: '78701',
};

describe('profile', () => {
  test('GET /users/me returns profile with addresses', async () => {
    const { token } = await apiRegister(request, app);
    const res = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.addresses).toEqual([]);
  });

  test('PATCH /users/me updates name and phone', async () => {
    const { token } = await apiRegister(request, app);
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name', phone: '+1 512-555-0100' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('New Name');
    expect(res.body.data.user.phone).toBe('+1 512-555-0100');
  });

  test('invalid phone is rejected', async () => {
    const { token } = await apiRegister(request, app);
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: 'abc' });
    expect(res.status).toBe(400);
  });
});

describe('addresses', () => {
  test('first address becomes default; explicit default transfers', async () => {
    const { token } = await apiRegister(request, app);
    const auth = (r) => r.set('Authorization', `Bearer ${token}`);
    const a = await auth(request(app).post('/api/v1/users/me/addresses').send(ADDRESS));
    expect(a.status).toBe(201);
    expect(a.body.data.isDefault).toBe(true);

    const b = await auth(
      request(app).post('/api/v1/users/me/addresses').send({ ...ADDRESS, label: 'Office', isDefault: true })
    );
    expect(b.body.data.isDefault).toBe(true);

    const list = await auth(request(app).get('/api/v1/users/me/addresses'));
    const defaults = list.body.data.filter((x) => x.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].label).toBe('Office');
  });

  test('deleting the default promotes another address', async () => {
    const { token } = await apiRegister(request, app);
    const auth = (r) => r.set('Authorization', `Bearer ${token}`);
    const a = await auth(request(app).post('/api/v1/users/me/addresses').send(ADDRESS));
    await auth(request(app).post('/api/v1/users/me/addresses').send({ ...ADDRESS, label: 'Office' }));
    await auth(request(app).delete(`/api/v1/users/me/addresses/${a.body.data.id}`));
    const list = await auth(request(app).get('/api/v1/users/me/addresses'));
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].isDefault).toBe(true);
  });

  test('unknown address id returns 404', async () => {
    const { token } = await apiRegister(request, app);
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const del = await request(app)
      .delete('/api/v1/users/me/addresses/64b64b64b64b64b64b64b64b')
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(404);
  });

  test('addresses require auth', async () => {
    const res = await request(app).get('/api/v1/users/me/addresses');
    expect(res.status).toBe(401);
  });
});

describe('admin user management', () => {
  test('admin lists users; non-admin is forbidden; self-status change blocked', async () => {
    await apiRegister(request, app, { email: 'admin-x@example.com' });
    await setRole('admin-x@example.com', 'ADMIN');
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin-x@example.com', password: 'TestPass1!' });

    const other = await apiRegister(request, app);
    const list = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminLogin.body.data.token}`);
    expect(list.status).toBe(200);
    expect(list.body.pagination.total).toBe(2);

    const forbidden = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${other.token}`);
    expect(forbidden.status).toBe(403);

    const me = await User.findOne({ email: 'admin-x@example.com' });
    const selfChange = await request(app)
      .patch(`/api/v1/users/${me._id}/status`)
      .set('Authorization', `Bearer ${adminLogin.body.data.token}`)
      .send({ status: 'SUSPENDED' });
    expect(selfChange.status).toBe(422);

    const target = await User.findOne({ email: other.user.email });
    const change = await request(app)
      .patch(`/api/v1/users/${target._id}/status`)
      .set('Authorization', `Bearer ${adminLogin.body.data.token}`)
      .send({ status: 'SUSPENDED' });
    expect(change.status).toBe(200);
    expect(change.body.data.user.status).toBe('SUSPENDED');
  });
});
