'use strict';

var debug = require('debug')('pipes');
var util = require('util');

module.exports = function create(fittingDef, bagpipes) {

  if (typeof fittingDef.input !== 'string') { throw new Error('input must be a pipe name'); }

  try {
    var pipe = bagpipes.getPipe(fittingDef.input);
  } catch (err) {
    var pipeDef = [ fittingDef.input ];
    pipe = bagpipes.createPipe(pipeDef);
  }

  if (!pipe) {
    var msg = util.format('unknown pipe: %s', context.input);
    console.error(msg);
    throw new Error(msg);
  }

  return function onError(context, cb) {

    debug('setting error handler: %s', context.input);
    context._errorHandler = pipe;
    cb();
  }
};
