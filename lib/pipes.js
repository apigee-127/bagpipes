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

var pipeworks = require('pipeworks');
var _ = require('lodash');
var debug = require('debug')('pipes');
var debugContent = require('debug')('pipes:content');
var helpers = require('./helpers');
var util = require('util');
var fs = require('fs');
var path = require('path');

var fittingTypes = {};
var pipes = {};
var config;

// todo: validate all pipes & fittings on create
// todo: allow for forward pipe refs

module.exports = {
  create: createPipes,
  wrapFitting: wrapFitting,
  connectMiddleware: connectMiddleware
};

// conf: { customControllersDir: '', customFittingsDir: '', customViewsDir: '' }
function createPipes(pipesDefs, conf) {

  config = _.extend(conf, { getPipe: getPipe });

  debug('creating pipes');
  loadFittingTypes();

  _.each(pipesDefs, function(pipeDef, pipeName) {
    getPipe(pipeName, pipeDef);
  });

  debug('done creating pipes');
  return pipes;
}

function getPipe(pipeName, pipeDef) {

  if (pipeName && pipes[pipeName]) { return pipes[pipeName]; } // defined pipe

  if (!pipeDef) {
    throw new Error('Pipe not found: ' + pipeName);
  }

  debug('creating pipe %s: %j', pipeName, pipeDef);
  var pipe = pipes[pipeName] = pipeworks();

  if (Array.isArray(pipeDef)) { // an array is a pipe

    pipeDef.forEach(function(step) {

      if (typeof step === 'string') { // named pipe

        if (pipes[step]) { // is actually a defined pipe

          var stepPipe = getPipe(step);
          pipe.fit(function(context, next) {
            stepPipe.siphon(context, next);
          });
          return;

        } else { // allow it to be just a system step

          var newStep = {};
          newStep[step] = undefined;
          step = newStep;
        }
      }

      if (typeof step === 'number') { throw new Error(util.format('invalid step: %j in def: %j', step , pipeDef)); }
      var keys = Object.keys(step);

      var fittingDef;
      if (keys.length > 1) { // inline parallel

        fittingDef = {
          name: 'parallel',
          input: step
        };

      } else { // normal fitting

        var name = keys[0];
        fittingDef = { name: name, input: step[name] };
      }
      if (fittingDef) { pipe.fit(createFitting(fittingDef)); }
    });

  } else { // a 1-fitting pipe

    pipe.fit(createFitting(pipeDef));
  }

  return pipe;
}

function loadFittingTypes() {

  var fittingTypesDir = path.resolve(__dirname, 'fittingTypes');

  var files = fs.readdirSync(fittingTypesDir);

  files.forEach(function(file) {
    if (file.substr(-3) === '.js') {
      var name = file.substr(0, file.length - 3);
      fittingTypes[name] = require(path.resolve(fittingTypesDir, file));
      debug('loaded fitting type: %s', name);
    }
  });
  return fittingTypes;
}

function createFitting(fittingDef) {

  debug('create fitting %j', fittingDef);

  if (fittingDef.type) {
    return newFitting(fittingDef.type, fittingDef);
  }

  // anonymous fitting, try user then system
  try {
    return newFitting('user', fittingDef);
  } catch (err) {
    return newFitting('system', fittingDef);
  }
}

function newFitting(fittingType, fittingDef) {

  var fittingFactory = fittingTypes[fittingType];
  if (!fittingFactory) { throw new Error('invalid fitting type: ' + fittingType); }

  var fitting = fittingFactory(config, fittingDef);
  return wrapFitting(fitting, fittingDef);
}

function wrapFitting(fitting, fittingDef) {

  return function(context, next) {
    try {
      preflight(context, fittingDef);
      fitting(context, function(err, result) {
        if (err) { return handleError(context, err); }
        postFlight(context, fittingDef, result, next);
      });
    } catch (err) {
      handleError(context, err);
    }
  };
}

function handleError(context, err) {

  if (!util.isError(err)) { err = new Error(JSON.stringify(err)); }

  debug('caught error: %s', err.stack);
  if (!context._errorHandler) { return unhandledError(context, err); }

  context.error = err;
  debug('starting onError pipe');
  try {
    pipeworks()
      .fit(function(context, next) { context._errorHandler.siphon(context, next); })
      .fit(function(context, ignore) { context._finish(); })
      .flow(context);
  } catch(err) {
    unhandledError(context, err);
  }
}

function unhandledError(context, err) {
  context.statusCode = 500;
  context.output = err.message ? err.message : JSON.stringify(err);
  context._finish();
}

function preflight(context, fittingDef) {

  debug('pre-flight fitting: %s', fittingDef.name);
  context.input = resolveInput(context, fittingDef.input);
  debug('input: %j', context.input);
}

function resolveInput(context, input) {

  if (!context) { debug('ack!', new Error().stack) }

  if (Array.isArray(input)) {
    return _.map(input, function(input) { return resolveInput(context, input); });
  }

  if (typeof input === 'object') {

    var result = {};
    _.each(input, function(inputDef, name) {

      result[name] =
        (inputDef.in)
          ? helpers.getParameterValue(name, inputDef, context)
          : resolveInput(context, inputDef);
    });
    return result;
  }

  return input;
}

function postFlight(context, fittingDef, result, next) {

  debug('post-flight fitting: %s', fittingDef.name);
  var target = fittingDef.output;
  if (target) {
    if (target[0] === '_') { throw new Error('output names starting with _ are reserved'); }
    if (target === 'request' || target === 'response') {
      throw new Error('"request" and "response" are reserved names');
    }
  } else {
    target = 'output';
  }
  context[target] = result;
  debugContent('output (context[%s]): %j', target, context.output);
  next(context);
}

function connectMiddleware() {
  return require('./connect_middleware')(pipes);
}
