'use strict';

var _ = require('lodash');
var debug = require('debug')('pipes');
var JSPath = require('jspath');

module.exports = {
  resolveInput: resolveInput,
  faultHandler: faultHandler
};

function resolveInput(context, input) {

  if (!input) { return context.output; }

  if (Array.isArray(input)) {
    return _.map(input, function(input) { return resolveInput(context, input); });
  }

  if (isParameter(input)) {
    debug('isInput: ', input);
    return getParameterValue(input, context);
  }

  if (typeof input === 'object') {
    var result = {};
    _.each(input, function(inputDef, name) {

      result[name] =
        (isParameter(inputDef))
          ? getParameterValue(inputDef, context)
          : resolveInput(context, inputDef);
    });
    return result;
  }

  return input;
}

function isParameter(inputDef) {
  return !_.isUndefined(inputDef)
      && (typeof inputDef === 'string' ||
         (typeof inputDef === 'object' && inputDef.path && inputDef.default));
}

// parameter: string || { path, default }
function getParameterValue(parameter, context) {

  var path = parameter.path || parameter;

  var value = (path[0] === '.') ? JSPath.apply(path, context) : path;

  //console.log('****', path, context, value);

  // Use the default value when necessary
  if (_.isUndefined(value)) { value = parameter.default; }

  return value;
}

// todo: move to connect_middleware !
function faultHandler(context, error) {
  debug('default errorHandler: %s', error.stack ? error.stack : error.message);
  if (context.response) {
    context.response.statusCode = 500;
    context.response.end(error.message);
  }
}
