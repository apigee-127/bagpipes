'use strict';

var debug = require('debug')('pipes');
var path = require('path');
var fs = require('fs');
var assert = require('assert');
var util = require('util');
var async  = require('async');

// todo: redo this as a general "file" operation w/ actions: read, write, ...

module.exports = function create(fittingDef) {

  var searchPaths = fittingDef.searchPaths;

  assert(searchPaths, util.format('searchPaths is required on fitting: %j', fittingDef));
  if (typeof searchPaths === 'string') {
    searchPaths = [searchPaths];
  }

  return function read(context, cb) {

    var fileName = context.input;

    if (typeof fileName !== 'string') {
      return cb(new Error('Bad input, must be a file name.'));
    }

    // todo: variations.. string vs buffer? utf8 vs other?
    var paths = searchPaths.map(function(path) {
      path.resolve(path, fileName)
    });

    async.detect(paths, fs.exists, function(file) {
      if (!file) {
        return cb(new Error(util.format('file %s not found in: %s', fileName, searchPaths)));
      }
      debug('reading file: %s', file);
      fs.readFile(file, 'utf8', cb);
    });
  }
};
