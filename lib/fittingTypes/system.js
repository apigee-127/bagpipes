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
var assert = require('assert');
var util = require('util');

module.exports = function createFitting(config, fittingDef) {

  assert(fittingDef.name, util.format('name is required on fitting: %j', fittingDef));

  var dir = config.fittingsDir || path.resolve(__dirname, '../fittings');

  var modulePath = path.resolve(dir, fittingDef.name);
  try {
    var module = require(modulePath);
    var fitting = module(fittingDef, config);
    debug('loaded system fitting %s from %s', fittingDef.name, dir);
    return fitting;
  } catch (err) {
    debug('no system fitting %s in %s', fittingDef.name, dir);
    throw err;
  }
};
