'use strict';

var debug = require('debug')('pipes');
var JSPath = require('jspath');

module.exports = function create() {

  return function path(context, cb) {

    var input = context.input;
    var output = JSPath.apply(input, context.output);
    cb(null, output);
  }
};
