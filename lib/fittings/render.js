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

var debug = require('debug')('pipes');
var Mustache = require('mustache');
var path = require('path');
var fs = require('fs');

module.exports = function create(fittingDef, config) {

  var viewDirs = config.userViewsDirs;
  // todo: check that directories exist!

  return function render(context, cb) {

    var input = context.input;

    if (typeof input === 'string' && input[0] === '@') {

      var fileName = input.slice(1);
      input = getInput(viewDirs, fileName);
      if (!input) {
        throw new Error('user fitting %s not found in %s', fittingDef, config.userFittingsDirs);
      }
    }

    var output = Mustache.render(input, context.output);
    cb(null, output);
  }
};

function getInput(viewDirs, fileName) {
  for (var i = 0; i < viewDirs.length; i++) {
    var dir = viewDirs[i];
    var file = path.resolve(dir, fileName);
    try {
      debug('reading mustache file: %s', file);
      return fs.readFileSync(file, 'utf8');
    } catch (err) {
      debug('no mustache file here: %s', file);
    }
  }
  return null;
}
