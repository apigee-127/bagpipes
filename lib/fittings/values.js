'use strict';

var _ = require('lodash');
var debug = require('debug')('pipes');

module.exports = function create() {

  return function values(context, cb) {

    cb(null, _.values(context.output));
  }
};
