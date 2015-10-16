'use strict';

module.exports = function create() {
  return function test(context, cb) {
    throw new Error('test error');
  }
};
