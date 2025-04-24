/*  test/server.spec.js  */
const chai      = require('chai');
const chaiHttp  = require('chai-http');
const bcrypt    = require('bcryptjs');

const server = require('../src/index.js');
const db     = require('../src/js/config/db');

chai.use(chaiHttp);
const { expect } = chai;

/* ------------------------------------------------------------------
   Two *named* test identities
------------------------------------------------------------------ */
const EXISTING = {
  user : 'testuser',
  email: 'habitat044@gmail.com',
  pass : 'password123',
  phone: '5555555555',
};

const REGISTER = {
  user : 'reguser',               // will be created by the positive /register test
  email: 'reg@example.com',
  pass : 'Secret42!',
  phone: '5552221111',
};

/* ------------------------------------------------------------------
   GLOBAL SETUP
   • make sure EXISTING is in the table with a bcrypt password
   • make sure REGISTER is *not* in the table
------------------------------------------------------------------ */
before(async () => {
  const hash = await bcrypt.hash(EXISTING.pass, 10);

  await db.tx(async t => {
    await t.none(`
      INSERT INTO users (username,email,password,phone)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (username)
      DO UPDATE SET password = EXCLUDED.password`,
      [EXISTING.user, EXISTING.email, hash, EXISTING.phone]);

    await t.none('DELETE FROM users WHERE username = $1', [REGISTER.user]);
  });
});

/* ==================================================================
   1. AUTH  – Login & Registration
================================================================== */
describe('AUTH  – Login & Registration endpoints', () => {

  /* ------------------------  POST /login  ----------------------- */
  describe('POST /login', () => {
    it('logs in with correct credentials and redirects to /dashboard', done => {
      chai.request(server)
        .post('/login')
        .redirects(0)
        .type('form')
        .send({ username: EXISTING.user, password: EXISTING.pass })
        .end((err, res) => {
          expect(res).to.have.status(302);
          expect(res).to.have.header('location', '/dashboard');
          done(err);
        });
    });

    it('rejects wrong password with 400 and error page', done => {
      chai.request(server)
        .post('/login')
        .redirects(0)
        .type('form')
        .send({ username: EXISTING.user, password: 'wrongPassword!' })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.text).to.include('Incorrect username or password');
          done(err);
        });
    });
  });

  /* ----------------------  POST /register  ---------------------- */
  describe('POST /register', () => {

    it('registers a *new* user (reguser) then redirects to /login', done => {
      chai.request(server)
        .post('/register')
        .redirects(0)
        .type('form')
        .send({
          username: REGISTER.user,
          email   : REGISTER.email,
          password: REGISTER.pass,
          phone   : REGISTER.phone,
        })
        .end((err, res) => {
          expect(res).to.have.status(302);
          expect(res).to.have.header('location', '/login');
          done(err);
        });
    });

    it('rejects duplicate username (testuser) with 400', done => {
      chai.request(server)
        .post('/register')
        .redirects(0)
        .type('form')
        .send({
          username: EXISTING.user,            // duplicate
          email   : 'unique@example.com',
          password: 'AnotherPass1!',
          phone   : '5553334444',
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.text).to.include('Username already exists');
          done(err);
        });
    });
  });
});

/* ==================================================================
   2. HABITS  – date-filtered API
================================================================== */
describe('API  /api/habits/date/:date', () => {
  let agent;

  before(done => {
    agent = chai.request.agent(server);
    agent
      .post('/login')
      .redirects(0)
      .type('form')
      .send({ username: EXISTING.user, password: EXISTING.pass })
      .end(done);
  });

  after(() => agent.close());

  it('returns habits JSON for a valid date', done => {
    const today = new Date().toISOString().slice(0, 10);
    agent.get(`/api/habits/date/${today}`).end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.body).to.include({ success:true, date:today });
      expect(res.body.habits).to.be.an('array');
      done(err);
    });
  });

  it('rejects an invalid date string with 400 + error JSON', done => {
    agent.get('/api/habits/date/not-a-date').end((err, res) => {
      expect(res).to.have.status(400);
      expect(res.body).to.deep.equal({
        success:false,
        error:'Invalid date format. Use YYYY-MM-DD.',
      });
      done(err);
    });
  });
});

/* ------------------------------------------------------------------
   GLOBAL TEARDOWN
------------------------------------------------------------------ */
after(() => server.close());
