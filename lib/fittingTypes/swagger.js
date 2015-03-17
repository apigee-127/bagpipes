/****************************************************************************
 The MIT License (MIT)

 Copyright (c) 2015 Apigee Corporation

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
'use strict';

var debug = require('debug')('pipes:fittings');

module.exports = function createFitting(config, fittingDef) {

  var client = require('swagger-client');
  var swagger = new client.SwaggerClient({
    url: fittingDef.url,
    success: function() {
      debug('swaggerjs initialized');
    },
    failure: function(err) {
      console.log('swaggerjs', err); // todo: what?
    },
    progress: function(msg) {
      debug('swaggerjs', msg);
    }
  });
  swagger.build();

  return function(context, next) {
    var api = swagger.apis[context.input.api];
    var operation = api[context.input.operation];
    debug('swagger-js api: %j', api);
    debug('swagger-js operation: %j', operation);
    debug('swagger-js input: %j', context.input);
    operation(context.input, function(result) {
      next(null, result);
    });
  };
};

/*
Example SwaggerJs result:

{ headers:
   { input:
      { 'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, DELETE, PUT',
        'access-control-allow-headers': 'Content-Type, api_key, Authorization',
        'content-type': 'application/json',
        connection: 'close',
        server: 'Jetty(9.2.7.v20150116)' },
     normalized:
      { 'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, PUT',
        'Access-Control-Allow-Headers': 'Content-Type, api_key, Authorization',
        'Content-Type': 'application/json',
        Connection: 'close',
        Server: 'Jetty(9.2.7.v20150116)' } },
  url: 'http://petstore.swagger.io:80/v2/pet/1',
  method: 'GET',
  status: 200,
  data: <Buffer 7b 22 69 64 22 3a 31 2c 22 63 61 74 65 67 6f ...>,
  obj:
   { id: 1,
     category: { id: 1, name: 'string' },
     name: 'doggie',
     photoUrls: [ 'string' ],
     tags: [ [Object] ],
     status: 'string' } }
 */
