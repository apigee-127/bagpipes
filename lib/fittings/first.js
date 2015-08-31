'use strict';

var _ = require('lodash');
var debug = require('debug')('pipes');

module.exports = function create() {

  return function first(context, cb) {

    cb(null, _.first(context.output));
  }
};
