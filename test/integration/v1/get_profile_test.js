'use strict';

describe('GET /account/profile', () => {
  db.sync();

  let user;

  beforeEach(() => {
    user = factory.buildSync('user');
    return user.save();
  });

  it('returns the user profile', done => {
    api.account(user).getProfile()
    .expect(200)
    .end((err, res) => {
      if (err) { return done(err); }

      let profile = format.timestamps(res.body.profile);

      expect(user.getProfile())
        .to.eventually.have.property('dataValues')
        .that.deep.equals(profile)
        .notify(done);
    });
  });

  context('when API token is incorrect', () => {
    it('returns an unauthorized status', done => {
      api.account().getProfile()
      .expect(401, {}, done);
    });
  });
});
