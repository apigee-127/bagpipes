'use strict';

var debug = require('debug')('pipes:fittings');
var path = require('path');
var _ = require('lodash');
var assert = require('assert');
var util = require('util');

module.exports = function createFitting(pipes, fittingDef) {

  assert(fittingDef.module, util.format('module is required on fitting: %j', fittingDef));
  assert(fittingDef.function, util.format('function is required on fitting: %j', fittingDef));

  for (var i = 0; i < pipes.config.connectMiddlewareDirs.length; i++) {
    var dir = pipes.config.connectMiddlewareDirs[i];

    try {
      var modulePath = path.resolve(dir, fittingDef.module);
      var controller = require(modulePath);
      var fn = controller[fittingDef['function']];

      if (fn) {
        debug('using %s controller in %s', fittingDef.module, dir);
        return connectCaller(fn);
      } else {
        debug('missing function %s on controller %s in %s', fittingDef['function'], fittingDef.module, dir);
      }
    } catch (err) {
      debug('no controller %s in %s', fittingDef.module, dir);
    }
  }

  throw new Error('controller not found in %s for fitting %j', pipes.config.connectMiddlewareDirs, fittingDef);
};

function connectCaller(fn) {
  return function connect_middleware(context, next) {
    fn(context.request, context.response, function(err) {
      next(err);
    });
  }
}
