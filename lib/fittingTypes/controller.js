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
var path = require('path');
var _ = require('lodash');
var assert = require('assert');
var util = require('util');
var helpers = require('../helpers');

module.exports = function createFitting(config, fittingDef) {

  assert(fittingDef.controller, util.format('controller is required on fitting: %j', fittingDef));
  assert(fittingDef.function, util.format('function is required on fitting: %j', fittingDef));

  for (var i = 0; i < config.userControllersDirs.length; i++) {
    var dir = config.userControllersDirs[i];

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

  throw new Error('controller not found in %s for fitting %j', config.userControllersDirs, fittingDef);
};

function connectCaller(fn) {
  return function(context, next) {
    fn(context.request, context.response, function(err) {
      next(err);
    });
  }
}
