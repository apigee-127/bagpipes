'use strict';

var debug = require('debug')('pipes');
var _ = require('lodash');

module.exports = function create() {

  return function omit(context, cb) {

    var input = context.input;

    if (Array.isArray(context.output)) {
      cb(null, _.map(context.output, _.partialRight(_.pick, input)));
    } else {
      cb(null, _.pick(context.output, input));
    }
  }
};
