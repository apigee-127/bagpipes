'use strict';

var debug = require('debug')('pipes');
var Mustache = require('mustache');
var path = require('path');
var fs = require('fs');
var assert = require('assert');
var util = require('util');

module.exports = function create(fittingDef, bagpipes) {

  var viewDirs = bagpipes.config.userViewsDirs;
  assert(viewDirs, 'userViewsDirs not configured');

  return function render(context, cb) {

    var input = context.input;

    if (typeof input === 'string' && input[0] === '@') {

      var fileName = input.slice(1);
      input = getInput(viewDirs, fileName);
      if (!input) {
        throw new Error(util.format('file not found for %j in %s', fittingDef, bagpipes.config.userViewsDirs));
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
