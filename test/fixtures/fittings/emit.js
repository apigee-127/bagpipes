'use strict';

module.exports = function create() {
  return function emit(context, cb) {
    cb(null, 'test');
  }
};
