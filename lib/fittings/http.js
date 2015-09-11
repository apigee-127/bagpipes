'use strict';

var debug = require('debug')('pipes');
var _ = require('lodash');
var Http = require('machinepack-http');

// defaults output -> url
module.exports = function create(fittingDef) {

  var config = _.extend({ baseUrl: '' }, fittingDef.config);

  return function http(context, cb) {

    var input = (typeof context.input === 'string') ? { url: context.input } : context.input;

    var options = _.extend({ url: context.output }, input, config);

    Http.sendHttpRequest(options, cb);
  }
};

/* input:
 url: '/pets/18',
 baseUrl: 'http://google.com',
 method: 'get',
 params: {},
 headers: {}
 */
