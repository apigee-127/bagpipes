'use strict';

var pipeworks = require('pipeworks');
var _ = require('lodash');
var debug = require('debug')('pipes');
var debugContent = require('debug')('pipes:content');
var helpers = require('./helpers');
var util = require('util');
var fs = require('fs');
var path = require('path');
var assert = require('assert');

// todo: allow for forward pipe refs?

module.exports = {
  // conf: { connectMiddlewareDirs: [], userFittingsDirs: [], userViewsDirs: [] }
  create: function createPipes(pipesDefs, conf) {
    return new Bagpipes(pipesDefs, conf);
  }
};

function Bagpipes(pipesDefs, conf) {
  debug('creating pipes:', pipesDefs);
  //debug('config:', conf);

  this.fittingTypes = {};
  this.pipes = {};
  this.config = _.clone(conf || {});

  this.loadFittingTypes();

  var self = this;
  _.each(pipesDefs, function(pipeDef, pipeName) {
    self.getPipe(pipeName, pipeDef);
  });

  debug('done creating pipes');
}

// lazy create if pipeDef is included
Bagpipes.prototype.getPipe = function getPipe(pipeName, pipeDef) {

  if (pipeName && this.pipes[pipeName]) { return this.pipes[pipeName]; } // defined pipe

  if (!pipeDef) {
    throw new Error('Pipe not found: ' + pipeName);
  }

  debug('creating pipe %s: %j', pipeName, pipeDef);
  return this.pipes[pipeName] = this.createPipe(pipeDef);
};

Bagpipes.prototype.play = function play(pipe, context) {

  assert(typeof context === 'undefined' || typeof context === 'object', 'context must be an object');
  if (!context) { context = {}; }

  var pw = pipeworks();
  pw.fit(function(context, next) { pipe.siphon(context, next); });
  if (context._finish) pw.fit(context._finish);
  pw.flow(context);
};

Bagpipes.prototype.createPipe = function createPipe(pipeDef) {

  var self = this;
  var pipe = pipeworks();

  if (Array.isArray(pipeDef)) { // an array is a pipe

    pipeDef.forEach(function(step) {

      var keys = (typeof step === 'object') ? Object.keys(step) : undefined;

      if (keys && keys.length > 1) { // parallel pipe

        fittingDef = {
          name: 'parallel',
          input: step
        };
        pipe.fit(self.createFitting(fittingDef));

      } else {

        var name = keys ? keys[0] : step;
        var input = keys ? step[name] : undefined;

        if (self.pipes[name]) { // a defined pipe

          debug('fitting pipe: %s', name);
          var stepPipe = self.getPipe(name);
          pipe.fit(function(context, next) {
            debug('running pipe: %s', name);
            if (input) {
              context.input = helpers.resolveInput(context, input);
              debug('input: %j', context.input);
            }
            stepPipe.siphon(context, next);
          });

        } else { // a fitting

          var fittingDef = { name: name, input: input };
          pipe.fit(self.createFitting(fittingDef));
        }
      }
    });

  } else { // a 1-fitting pipe

    pipe.fit(this.createFitting(pipeDef));
  }

  return pipe;
};

Bagpipes.prototype.createPipeFromFitting = function createPipeFromFitting(fitting, def) {
  return pipeworks().fit(this.wrapFitting(fitting, def));
};

Bagpipes.prototype.loadFittingTypes = function loadFittingTypes() {

  var fittingTypesDir = path.resolve(__dirname, 'fittingTypes');

  var files = fs.readdirSync(fittingTypesDir);

  var self = this;
  files.forEach(function(file) {
    if (file.substr(-3) === '.js') {
      var name = file.substr(0, file.length - 3);
      self.fittingTypes[name] = require(path.resolve(fittingTypesDir, file));
      debug('loaded fitting type: %s', name);
    }
  });
  return this.fittingTypes;
};

Bagpipes.prototype.createFitting = function createFitting(fittingDef) {

  debug('create fitting %j', fittingDef);

  if (fittingDef.type) {
    return this.newFitting(fittingDef.type, fittingDef);
  }

  // anonymous fitting, try user then system
  var fitting = this.newFitting('user', fittingDef);
  if (!fitting) {
    fitting = this.newFitting('system', fittingDef);
  }
  return fitting;
};

Bagpipes.prototype.newFitting = function newFitting(fittingType, fittingDef) {
  var fittingFactory = this.fittingTypes[fittingType];
  if (!fittingFactory) { throw new Error('invalid fitting type: ' + fittingType); }

  var fitting = fittingFactory(this, fittingDef);
  return this.wrapFitting(fitting, fittingDef);
};

Bagpipes.prototype.wrapFitting = function wrapFitting(fitting, fittingDef) {

  if (!fitting) { return null; }

  var self = this;
  return function(context, next) {
    try {
      preflight(context, fittingDef);
      debug('enter fitting: %s', fittingDef.name);
      fitting(context, function(err, result) {
        debug('exit fitting: %s', fittingDef.name);
        if (err) { return self.handleError(context, err); }
        postFlight(context, fittingDef, result, next);
      });
    } catch (err) {
      self.handleError(context, err);
    }
  };
};

Bagpipes.prototype.handleError = function handleError(context, err) {

  if (!util.isError(err)) { err = new Error(JSON.stringify(err)); }

  debug('caught error: %s', err.stack);
  if (!context._errorHandler) { return unhandledError(context, err); }

  context.error = err;
  debug('starting onError pipe');
  this.play(context._errorHandler, context);
};

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
  } else {
    target = 'output';
  }
  context[target] = result;
  debugContent('output (context[%s]): %j', target, context.output);
  next(context);
}
