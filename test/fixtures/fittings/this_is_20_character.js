'use strict';

module.exports = function create() {
  return function test(context, cb) {
    cb(null, 'test');
  }
};
