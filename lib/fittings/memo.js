'use strict';

var debug = require('debug')('pipes');

module.exports = function create() {

  return function memo(context, cb) {

    context[context.input] = context.output;

    cb(null, context.output);
  }
};
