'use strict';

var debug = require('debug')('pipes');

module.exports = function create() {

  return function parse(context, cb) {

    if (context.input !== 'json') { throw new Error('parse input must be "json"'); }
    if (typeof context.output !== 'string') { throw new Error('context.output must be a string'); }

    cb(null, JSON.parse(context.output));
  }
};
