// ********************** Initialize server **********************************

const server = require('../src/index'); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************
  // describe('Server!', () => {
  //   // Sample test case given to test / endpoint.
  //   it('Returns the default welcome message', done => {
  //     chai
  //       .request(server)
  //       .get('/welcome')
  //       .end((err, res) => {
  //         expect(res).to.have.status(200);
  //         expect(res.body.status).to.equals('success');
  //         assert.strictEqual(res.body.message, 'Welcome!');
  //         done();
  //       });
  //   });
  // });


// *********************** TODO: WRITE 2 UNIT TESTCASES **************************

// *********************** LOGIN API TESTCASES **************************

/*
describe('Login API - Positive Test Case', () => {
  it('should log in successfully with valid credentials and redirect to /dashboard', done => {
    chai.request(server)
      .post('/login')
      .redirects(0) 
      .send({ username: 'testuser', password: 'password123' })
      .end((err, res) => {
        expect(res).to.have.status(302);
        expect(res).to.have.header('location', '/dashboard');
        done();
      });
  });
});

describe('Login API - Negative Test Case', () => {
  it('should fail to log in with invalid credentials and return a 400 status code', done => {
    chai.request(server)
      .post('/login')
      .redirects(0) 
      .send({ username: 'nonexistentuser', password: 'wrongpassword' })
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body.message).to.equal('Incorrect username or password.');
        done();
      });
  });
});

// *********************** REGISTRATION TESTCASES **************************


describe('Registration API', () => {

  // Positive test case: Registering a new user
  describe('Positive Test Case', () => {
    it('should register a new user and redirect to the login page', done => {
      chai.request(server)
        .post('/register')
        .redirects(0) // Prevent auto-following the redirect so we can assert on the response
        .send({
          username: 'testuser1',
          email: 'test1@example.com',
          password: 'Password123'
        })
        .end((err, res) => {
          expect(res).to.have.status(302);         // Expecting a redirect on success
          expect(res).to.have.header('location', '/login');
          done();
        });
    });
  });

  // Negative test cases: Attempting to register duplicate data
  describe('Negative Test Cases', () => {

    // First, register a user so we have duplicate records to test against
    before(done => {
      chai.request(server)
        .post('/register')
        .redirects(0)
        .send({
          username: 'duplicateUser',
          email: 'duplicate@example.com',
          password: 'Password123'
        })
        .end((err, res) => {
          // You can check if registration succeeded (302 redirect) here if needed.
          done();
        });
    });

    it('should not allow registration with a duplicate username', done => {
      chai.request(server)
        .post('/register')
        .redirects(0)
        .send({
          username: 'duplicateUser',          // duplicate username
          email: 'unique@example.com',
          password: 'Password123'
        })
        .end((err, res) => {
          expect(res).to.have.status(400);       // Expecting 400 due to duplicate key violation
          expect(res.text).to.include('Username already exists');
          done();
        });
    });

    it('should not allow registration with a duplicate email', done => {
      chai.request(server)
        .post('/register')
        .redirects(0)
        .send({
          username: 'uniqueUser',
          email: 'duplicate@example.com',       // duplicate email
          password: 'Password123'
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.text).to.include('An account with this email already exists');
          done();
        });
    });
  });

});

// ********************************************************************************
*/