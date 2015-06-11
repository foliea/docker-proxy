'use strict';

var User = require('../../../app/models').User;

const NEW_PASSWORD = 'asOPJkl,';

describe('PATCH /account/change_password', () => {
  db.sync();

  let user, oldPassword;

  beforeEach(() => {
    user = factory.buildSync('user');
    oldPassword = user.password;
    return user.save();
  });

  it('updates the user password', done => {
    api.account(user).changePassword()
    .field('old_password', oldPassword)
    .field('new_password', NEW_PASSWORD)
    .field('new_password_confirmation', NEW_PASSWORD)
    .expect(204)
    .end((err, res) => {
      if (err) { return done(err); }

      expect(user.reload())
        .to.eventually.satisfy(has.hashPassword(NEW_PASSWORD))
        .notify(done);
    });
  });

  context('with incorrect old password', () => {
    it('returns an forbidden status', done => {
      api.account(user).changePassword()
      .field('old_password', `${oldPassword}*`)
      .field('new_password', NEW_PASSWORD)
      .field('new_password_confirmation', NEW_PASSWORD)
      .expect(403)
      .end((err, res) => {
        if (err) { return done(err); }

        expect(user.reload())
          .to.eventually.satisfy(has.hashPassword(oldPassword))
          .notify(done);
      });
    });
  });

  context('with invalid password confirmation', () => {
    it('returns a bad request status with errors', done => {
      api.account(user).changePassword()
      .field('old_password', oldPassword)
      .field('new_password', NEW_PASSWORD)
      .expect(400)
      .end((err, res) => {
        if (err) { return done(err); }

        expect(res.body.errors).to.exist;
        expect(user.reload())
          .to.eventually.satisfy(has.hashPassword(oldPassword))
          .notify(done);
      });
    });
  });

  context('with invalid password', () => {
    it('returns a bad request status and errors', done => {
      api.account(user).changePassword()
      .field('old_password', oldPassword)
      .expect(400)
      .end((err, res) => {
        if (err) { return done(err); }

        user.password = null;

        expect(user.save()).to.be.rejectedWith(res.body.errors).notify(done);
      });
    });
  });

  context('with blacklisted attributes', () => {
    let attributes, reference;

    beforeEach(() => {
      attributes = _.difference(user.attributes,
        ['id', 'password', 'created_at', 'updated_at']
      );
      reference = factory.buildSync('forbiddenUser');
    });

    it('these attributes are filtered', done => {
      api.callWithAttributes(attributes, reference,
        api.account(user).changePassword()
      )
      .field('old_password', oldPassword)
      .field('new_password', NEW_PASSWORD)
      .field('new_password_confirmation', NEW_PASSWORD)
      .expect(204)
      .end((err, res) => {
        if (err) { return done(err); }

        expect(User.findById(user.id))
          .to.eventually.satisfy(has.beenFiltered(user, attributes))
          .notify(done);
      });
    });
  });
});
