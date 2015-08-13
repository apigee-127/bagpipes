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

// conf: { userControllersDirs: [], userFittingsDirs: [], userViewsDirs: [] }
function createPipes(pipesDefs, conf) {

  config = _.extend(conf, { getPipe: getPipe });

  debug('creating pipes w/ config %j', conf);
  loadFittingTypes();

  _.each(pipesDefs, function(pipeDef, pipeName) {
    getPipe(pipeName, pipeDef);
  });

  debug('done creating pipes');
  return pipes;
}

// lazy create
function getPipe(pipeName, pipeDef) {

  if (pipeName && pipes[pipeName]) { return pipes[pipeName]; } // defined pipe

  if (!pipeDef) {
    throw new Error('Pipe not found: ' + pipeName);
  }

  debug('creating pipe %s: %j', pipeName, pipeDef);
  var pipe = pipes[pipeName] = pipeworks();

  if (Array.isArray(pipeDef)) { // an array is a pipe

    pipeDef.forEach(function(step) {

      var keys = (typeof step === 'object') ? Object.keys(step) : undefined;

      if (keys && keys.length > 1) { // parallel pipe

        fittingDef = {
          name: 'parallel',
          input: step
        };
        pipe.fit(createFitting(fittingDef));

      } else {

        var name = keys ? keys[0] : step;
        var input = keys ? step[name] : undefined;

        if (pipes[name]) { // a defined pipe

          debug('fitting pipe: %s', name);
          var stepPipe = getPipe(name);
          pipe.fit(function(context, next) {
            debug('running pipe: %s', pipeDef);
            if (input) {
              context.input = helpers.resolveInput(context, input);
              debug('input: %j', context.input);
            }
            stepPipe.siphon(context, next);
          });

        } else { // a fitting

          var fittingDef = { name: name, input: input };
          pipe.fit(createFitting(fittingDef));
        }
      }
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
  var fitting = newFitting('user', fittingDef);
  if (!fitting) {
    fitting = newFitting('system', fittingDef);
  }
  return fitting;
}

function newFitting(fittingType, fittingDef) {
  var fittingFactory = fittingTypes[fittingType];
  if (!fittingFactory) { throw new Error('invalid fitting type: ' + fittingType); }

  var fitting = fittingFactory(config, fittingDef);
  return wrapFitting(fitting, fittingDef);
}

function wrapFitting(fitting, fittingDef) {

  if (!fitting) { return null; }

  return function(context, next) {
    try {
      preflight(context, fittingDef);
      debug('enter fitting: %s', fittingDef.name);
      fitting(context, function(err, result) {
        debug('exit fitting: %s', fittingDef.name);
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
  var resolvedInput = helpers.resolveInput(context, fittingDef.input);
  if (typeof resolvedInput === 'object' && !Array.isArray(resolvedInput)) {
    context.input = _.defaults({}, context.input, resolvedInput);
  } else {
    context.input = resolvedInput || context.input;
  }
  debug('input: %j', context.input);
}

function postFlight(context, fittingDef, result, next) {

  debug('post-flight fitting: %s', fittingDef.name);
  context.input = undefined;
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
