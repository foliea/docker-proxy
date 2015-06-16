'use strict';

const WHITELIST = ['fullname', 'location', 'company'];

describe('PATCH /account/profile', () => {
  db.sync();

  let user;

  beforeEach(() => {
    user = factory.buildSync('user');
    return user.save();
  });

  it('updates the user profile', done => {
    let reference = factory.buildSync('profile');

    api.callWithAttributes(WHITELIST, reference,
      api.account(user).updateProfile()
    )
    .expect(200)
    .end((err, res) => {
      if (err) { return done(err); }

      let profile = format.timestamps(res.body.profile);

      expect(_.pick(profile, WHITELIST))
        .to.deep.equal(_.pick(reference, WHITELIST));
      expect(user.getProfile())
        .to.eventually.have.property('dataValues')
        .that.deep.equals(profile)
        .notify(done);
    });
  });

  context('with invalid attributes', done => {
    it('responds with a bad request status and validation errors', done => {
      let fullname = _.repeat('*', 65);

      api.account(user).updateProfile()
      .field('fullname', fullname)
      .expect(400)
      .end((err, res) => {
        if (err) { return done(err); }

        expect(
          user.getProfile()
          .then(profile => {
            profile.fullname = fullname;
            return profile.save();
        }))
        .to.be.rejectedWith(res.body.errors)
        .notify(done);
      });
    });
  });

  /*
   * Verify that the user can't change ownership of it's
   * profile. In order to do that we must ensure that we
   * are providing a valid user_id, therefore we are using
   * the id of the default user.
   */
  context('with blacklisted attributes', () => {
    it('these attributes are filtered', done => {
      api.account(user).updateProfile()
      .field('user_id', 1)
      .expect(200)
      .end((err, res) => {
        if (err) { return done(err); }

        expect(user.getProfile()).not.to.eventually.be.null
          .notify(done);
      });
    });
  });

  context('when API token is incorrect', () => {
    it('returns an unauthorized status', done => {
      api.account().updateProfile()
      .expect(401, {}, done);
    });
  });
});
