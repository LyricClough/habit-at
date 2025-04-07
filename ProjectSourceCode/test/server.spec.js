// ********************** Initialize server **********************************

const server = require('../src/index'); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************


// *********************** TODO: WRITE 2 UNIT TESTCASES **************************

// *********************** LOGIN TESTCASE **************************

describe('Server!', () => {
  it('Redirects to the login page from the root endpoint', done => {
    chai
      .request(server)
      .get('/')
      .redirects(0) // Prevent automatic redirection
      .end((err, res) => {
        // Expect a 302 (or 301) redirection status code
        expect(res).to.have.status(302);
        // Optionally check the Location header for '/login'
        expect(res).to.have.header('location', '/login');
        done();
      });
  });
});


// ********************************************************************************
