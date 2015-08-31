'use strict';

var debug = require('debug')('pipes');

module.exports = function create() {

  return function path(context, cb) {

    var input = context.input;
    var output = _path(input, context.output);
    cb(null, output);
  }
};

function _path(path, obj) {
  if (!obj || !path || !path.length) { return null; }
  var paths = path.split('.');
  var val = obj;
  for (var i = 0, len = paths.length; i < len && val != null; i += 1) {
    val = val[paths[i]];
  }
  return val;
}
