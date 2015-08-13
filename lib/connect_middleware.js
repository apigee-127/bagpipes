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

/* Read and create pipes from Swagger. */

var pipeworks = require('pipeworks');
var debug = require('debug')('pipes');
var debugContent = require('debug')('pipes:content');
var SWAGGER_SELECTED_PIPE = 'x-swagger-pipe';
var _ = require('lodash');
var pipes = require('./pipes');

var DEFAULT_ERROR_HANDLER = createDefaultErrorHandler();

module.exports = function create(pipes) {

  return function connectMiddleware(req, res, next) {

    if (!req.swagger) { return next(); }

    var pipeName = req.swagger.operation[SWAGGER_SELECTED_PIPE] || req.swagger.path[SWAGGER_SELECTED_PIPE];
    if (!pipeName) { return next(); }

    var pipe = pipes[pipeName];

    if (!pipe) { return next(new Error('pipe ' + pipeName + ' not found')); }

    debug('executing pipe %s', pipeName);

    var context = {
      // system values
      request: req,
      response: res,
      _errorHandler: DEFAULT_ERROR_HANDLER,

      // user-modifiable values
      input: undefined,
      statusCode: undefined,
      headers: [],
      output: undefined
    };

    context._finish = function adaptToConnect(ignore1, ignore2) { // flow back to connect pipe

      debug('responding to client from pipe: %s', pipeName);

      // todo: what if response.statusCode is already set?
      // todo: what if response is already sent?
      var response = context.response;
      if (context.statusCode) {
        debug(' statusCode: %d', context.statusCode);
        response.statusCode = context.statusCode;
      }
      if (context.headers && context.headers.length) {
        debugContent(' headers: %j', context.headers);
        _.headers.forEach(function(value, name) {
          response.setHeader(name, value);
        });
      }
      if (context.output) {
        // todo: determine the correct thing to do if it's not JSON
        var body = (typeof context.output === 'object') ? JSON.stringify(context.output) : context.output;
        debugContent(' body: %s', body);
        response.end(body);
      }
      next();
    };

    pipeworks()
      .fit(function(context, next) { pipe.siphon(context, next); })
      .fit(context._finish)
      .flow(context);
  }
};

function createDefaultErrorHandler() {

  return pipeworks().fit(pipes.wrapFitting(defaultErrorFitting, { name: 'defaultErrorHandler' }));

  function defaultErrorFitting(context, next) {

    debug('default error handler: %s', context.error.message);
    context.statusCode = 500;
    next(null, context.error.message);
  }
}
