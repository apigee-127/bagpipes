'use strict';

var debug = require('debug')('pipes');
var _ = require('lodash');
var axios = require('axios');

// defaults output -> url
module.exports = function create(fittingDef) {

  var config = _.extend({ baseUrl: '' }, fittingDef.config);

  return function http(context, cb) {

    var input = (typeof context.input === 'string') ? { url: context.input } : context.input;

    var options = _.extend({ url: context.output }, config, input);

    axios({
      ...options,
      baseURL: options?.baseUrl,
    }).then(() => cb(null, options)).catch((err) => cb(err, options));
  }
};

/* input:
 url: '/pets/18',
 baseUrl: 'http://google.com',
 method: 'get',
 params: {},
 headers: {}
 */
