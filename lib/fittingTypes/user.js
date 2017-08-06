'use strict';

var debug = require('debug')('pipes:fittings');
var path = require('path');
var util = require('util');
var assert = require('assert');

module.exports = function createFitting(pipes, fittingDef) {

  assert(fittingDef.name, util.format('name is required on fitting: %j', fittingDef));
  if (!pipes.config.userFittingsDirs) { return null; }

  for (var i = 0; i < pipes.config.userFittingsDirs.length; i++) {
    var dir = pipes.config.userFittingsDirs[i];

    var modulePath = path.resolve(dir, fittingDef.name);
    try {
      var module = require(modulePath);
      var fitting = module(fittingDef, pipes);
      debug('loaded user fitting %s from %s', fittingDef.name, dir);
      return fitting;
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND') { throw err; }
      var pathFromError = err.message.match(/'.*?'/)[0];
      var fittingIndex = err.message.indexOf(fittingDef.name);
      if (err.message[fittingIndex - 1] === path.sep && err.message[fittingDef.name.length] !== path.sep) {
        debug('no user fitting %s in %s', fittingDef.name, dir);
      } else {
        throw err;
      }
    }
  }

  if (fittingDef.type !== 'user') {
    return null;
  }

  throw new Error('user fitting %s not found in %s', fittingDef, pipes.config.userFittingsDirs);
};
