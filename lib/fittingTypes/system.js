'use strict';

var debug = require('debug')('pipes:fittings');
var path = require('path');
var assert = require('assert');
var util = require('util');

module.exports = function createFitting(pipes, fittingDef) {

  assert(fittingDef.name, util.format('name is required on fitting: %j', fittingDef));

  var dir = pipes.config.fittingsDir || path.resolve(__dirname, '../fittings');

  var modulePath = path.resolve(dir, fittingDef.name);
  try {
    var module = require(modulePath);
    var fitting = module(fittingDef, pipes);
    debug('loaded system fitting %s from %s', fittingDef.name, dir);
    return fitting;
  } catch (err) {
    debug('no system fitting %s in %s', fittingDef.name, dir);
    throw err;
  }
};
