'use strict';

var debug = require('debug')('pipes:fittings');
var path = require('path');
var _ = require('lodash');
var assert = require('assert');
var util = require('util');

module.exports = function createFitting(pipes, fittingDef) {

  assert(fittingDef.controller, util.format('controller is required on fitting: %j', fittingDef));
  assert(fittingDef.function, util.format('function is required on fitting: %j', fittingDef));

  for (var i = 0; i < pipes.config.userControllersDirs.length; i++) {
    var dir = pipes.config.userControllersDirs[i];

    try {
      var modulePath = path.resolve(dir, fittingDef.controller);
      var controller = require(modulePath);
      var fn = controller[fittingDef['function']];

      if (fn) {
        debug('using %s controller in %s', fittingDef.controller, dir);
        return connectCaller(fn);
      } else {
        debug('missing function %s on controller %s in %s', fittingDef['function'], fittingDef.controller, dir);
      }
    } catch (err) {
      debug('no controller %s in %s', fittingDef.controller, dir);
    }
  }

  throw new Error('controller not found in %s for fitting %j', pipes.config.userControllersDirs, fittingDef);
};

function connectCaller(fn) {
  return function(context, next) {
    fn(context.request, context.response, function(err) {
      next(err);
    });
  }
}
