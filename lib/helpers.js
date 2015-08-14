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

var Url = require('url');
var _ = require('lodash');
var debug = require('debug')('pipes');

module.exports = {
  resolveInput: resolveInput,
  faultHandler: faultHandler
};

function resolveInput(context, input) {

  if (!input) { return context.output; }

  if (Array.isArray(input)) {
    return _.map(input, function(input) { return resolveInput(context, input); });
  }

  if (typeof input === 'object') {

    if (isParameter(input)) {
      debug('isInput: ', input)
      return getParameterValue(null, input, context);
    }

    var result = {};
    _.each(input, function(inputDef, name) {

      result[name] =
        (isParameter(inputDef))
          ? getParameterValue(name, inputDef, context)
          : resolveInput(context, inputDef);
    });
    return result;
  }

  return input;
}

function isParameter(inputDef) {
  return inputDef && inputDef.in;
}

// parameter: { name, in, default }
function getParameterValue(key, parameter, context) {

  var name = parameter.name || key; // make name optional (defaults to key)
  var req = context.request;

  var value;
  var input = parameter.in || 'output';
  var useEntireObject = (name === '*');

  // Get the value to validate based on the operation parameter type
  switch (input) {

    case 'body':
    case 'form':
    case 'formData':

      debug('body: %j', req.body)
      value = useEntireObject ? req.body : req.body[name];
      break;

    case 'header':
      value = useEntireObject ? req.headers : req.headers[name.toLowerCase()];
      break;

    case 'query':
      value = useEntireObject ? req.query : req.query[name];
      break;

    case 'parameters':
      if (useEntireObject) {
        value = req.swagger.params;
      } else {
        value = req.swagger.params[name] ? req.swagger.params[name].value : undefined;
      }
      break;

    case 'output':
      value = useEntireObject ? context.output: context.output[name];
      break;

    case 'context':
      value = useEntireObject ? context: context[name];
      break;

    case 'path':
      if (name === 'subpath') {
        value = calcSubpath(context.request);
      } else if (useEntireObject || name === 'path') {
        value = req.swagger.apiPath;
      } else {
        throw new Error('Illegal path value: %s', name);
      }
      break;
  }

  // Use the default value when necessary
  if (!value && !_.isUndefined(parameter.default)) {
    value = parameter.default;
  }

  return value;
}

// todo: move to connect_middleware
function faultHandler(context, error) {
  debug('default errorHandler: %s', error.stack ? error.stack : error.message);
  if (context.response) {
    context.response.statusCode = 500;
    context.response.end(error.message);
  }
}

function calcSubpath(request) { // subpath of the swagger path
  if (!request.swagger.path.prefixRegExp) {
    request.swagger.path.prefixRegExp = new RegExp('^' + request.swagger.apiPath);
  }
  return Url.resolve('/', request.url.replace(request.swagger.path.prefixRegExp, ''));
}
