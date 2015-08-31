'use strict';

// todo: This is just for play... fix it or (probably) remove it!

var debug = require('debug')('pipes');

module.exports = function create() {

  return function evaluate(context, cb) {

    if (typeof context.input !== 'string') { throw new Error('eval input must be a string'); }

    eval(context.input);

    cb(null, context.output);
  }
};
