'use strict';

var debug = require('debug')('pipes');
var _ = require('lodash');

module.exports = function create() {

  return function amend(context, cb) {

   if (typeof context.input !== 'object' || Array.isArray(context.input)) {
     throw new Error('input must be an object');
   }

   if (context.output === null || context.output === undefined) { context.output = {}; }

   if (typeof context.output !== 'object' || Array.isArray(context.output)) {
    throw new Error('output must be an object');
   }

    cb(null, _.assign(context.output, context.input));
  }
};
