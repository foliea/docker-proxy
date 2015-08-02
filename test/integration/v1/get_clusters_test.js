'use strict';

let _ = require('lodash');

const DEFAULT_LIMIT  = 25,
      DEFAULT_OFFSET = 0,
      CLUSTER_COUNT  = DEFAULT_LIMIT + 1;

describe('GET /clusters/', () => {
  db.sync();

  let user;

  beforeEach(done => {
    user = factory.buildSync('user');
    user.save().then(() => {
      factory.createMany('cluster', { user_id: user.id }, CLUSTER_COUNT, done);
    }).catch(done);
  });

  it('retrieves the user clusters', done => {
    let opts = { limit: DEFAULT_LIMIT, offset: DEFAULT_OFFSET };

    api.clusters(user).getAll()
    .expect(200, has.many(user, 'clusters', opts, done));
  });

  context('when user limits the number of results', () => {
    let opts = { limit: 5, offset: DEFAULT_OFFSET };

    it('retrieves a limited number of cluster', done => {
      api.clusters(user).getAll(`?limit=${opts.limit}`)
      .expect(200, has.many(user, 'clusters', opts, done));
    });

    context('with a negative limit', () => {
      it('returns a bad request error', done => {
        api.clusters(user).getAll('?limit=-1').expect(400).end(done);
      });
    });
  });

  context('when user asks for a specific offset of records', () => {
    let opts = { limit: 3, offset: 4 };

    it('retrieves the specified offset of cluster records', done => {
      api.clusters(user).getAll(`?limit=${opts.limit}&offset=${opts.offset}`)
      .expect(200, has.many(user, 'clusters', opts, done));
    });

    context('with a negative offset', () => {
      it('returns a bad request error', done => {
        api.clusters(user).getAll('?offset=-1').expect(400).end(done);
      });
    });
  });

  [
    ['strategy', 'random'],
    ['strategy', 'binpack'],
    ['strategy', 'spread'],
    ['name', 'whatever'],
    ['state', 'unreachable'],
    ['state', 'running'],
  ].forEach(([name, value]) => {
    context(`when user filters with ${value} ${name}`, () => {
      beforeEach(done => {
        let opts = { user_id: user.id },
          number = name === 'name' ? 1 : 3,
          factoryName = name === 'state' ? `${value}Cluster` : 'cluster';

        opts[name] = value;

        factory.createMany(factoryName, opts, number, done);
      });

      it(`retrieves only user clusters with ${value} ${name}`, done => {
        api.clusters(user).getAll(`?${name}=${value}`)
        .expect(200, (err, res) => {
          if (err) { return done(err); }

          if (_.isEmpty(res.body.clusters)) {
            return done(new Error('clusters list is empty!'));
          }
          expect(_.all(res.body.clusters, cluster => {
            return cluster[name] === value;
          })).to.be.true;
          done();
        });
      });
    });
  });

  context('when API token is incorrect', () => {
    it('returns an unauthorized status', done => {
      api.clusters().getAll().expect(401, {}, done);
    });
  });
});
