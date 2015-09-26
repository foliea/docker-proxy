'use strict';

let _ = require('lodash'),
  sequelize = require('sequelize'),
  errors = require('../../app/support').errors,
  errorHandler = rewire('../../app/middlewares/error_handler');

const INTERNAL_SERVER_ERROR = errorHandler.__get__('INTERNAL_SERVER_ERROR');

describe('ErrorHandler Middleware', () => {
  let res = {}, fakeConsole;

  beforeEach(() => {
    res.json = sinon.stub();
    res.status = sinon.stub().returns(res);

    fakeConsole = { error: sinon.stub() };

    errorHandler.__set__('console', fakeConsole);
  });

  [
    ['validation', new sequelize.ValidationError()],
    ['mismatch',   new errors.MismatchError('test')]
  ].forEach(([name, err]) => {
    context(`with a ${name} error`, () => {
      it('sends a bad request status', done => {
        errorHandler(err, {}, res, () => {
          expect(res.status).to.have.been.calledWith(400);
          done();
        });
      });

      it('sends validation errors', done => {
        errorHandler(err, {}, res, () => {
          expect(res.json).to.have.been.calledWith({
            name: 'validation_error',
            message: err.message,
            errors: serializedErrors(err.errors)
          });
          done();
        });
      });
    });
  });

  context('with a PaginationError', () => {
    let err = new errors.PaginationError({
      attribute: 'limit',
      value: -5,
      range: [0, 25]
    });

    it('sends a bad request status', done => {
      errorHandler(err, {}, res, () => {
        expect(res.status).to.have.been.calledWith(400);
        done();
      });
    });

    it('sends a pagination error', done => {
      errorHandler(err, {}, res, () => {
        expect(res.json).to.have.been.calledWith({
          name: 'pagination_error',
          message: err.message
        });
        done();
      });
    });
  });

  [
    ['StateError', 422],
    ['AlreadyUpgradedError', 409],
    ['DeletionError', 409, [new errors.StateError()]],
    ['NotMasterError', 403],
    ['MachineCredentialsError', 401],
    ['MachineNotFoundError', 404],
    ['MachineUnprocessableError', 422, random.string()]
  ].forEach(([errorName, status, opts]) => {
    context(`with a ${errorName}`, () => {
      let err = new errors[errorName](opts);

      it(`sends a ${status} request status`, done => {
        errorHandler(err, {}, res, () => {
          expect(res.status).to.have.been.calledWith(status);
          done();
        });
      });

      it('sends the error message back', done => {
        errorHandler(err, {}, res, () => {
          let expected = {
            name: _.snakeCase(err.name),
            message: err.message
          };
          if (_.has(err, 'errors')) {
            _.merge(expected, {
              errors: serializedErrors(err.errors)
            });
          }
          expect(res.json).to.have.been.calledWith(expected);
          done();
        });
      });
    });
  });

  /*
   * This function is a bit dangerous, we need to cloneDeep the errors as we
   * are faking the call to the middleware and moving the same error object
   * in and out.
   */
  function serializedErrors(errors) {
    return _.map(_.cloneDeep(errors), err => {
      err.name = _.snakeCase(err.name || err.type);
      delete err.type;
      return err;
    });
  }

  context('with any other error', () => {
    let err = new Error('whatever');

    it('sends an internal server error status', done => {
      errorHandler(err, {}, res, () => {
        expect(res.status).to.have.been.calledWith(500);
        done();
      });
    });

    it('sends an internal server error message', done => {
      errorHandler(err, {}, res, () => {
        expect(res.json)
          .to.have.been.calledWith(INTERNAL_SERVER_ERROR);
        done();
      });
    });

    it('logs the error message', done => {
      errorHandler(err, {}, res, () => {
        expect(fakeConsole.error).to.have.been.calledWith(err);
        done();
      });
    });
  });
});
