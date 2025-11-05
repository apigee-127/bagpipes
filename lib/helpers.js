'use strict'

const debug = require('debug')('pipes')
const JSPath = require('jspath')

module.exports = {
  resolveInput,
  faultHandler
}

function resolveInput (context, input) {
  if (!input) { return context.output }

  if (Array.isArray(input)) {
    return input.map(function (input) { return resolveInput(context, input) })
  }

  if (isParameter(input)) {
    debug('isInput: ', input)
    return getParameterValue(input, context)
  }

  if (typeof input === 'object') {
    const result = {}
    for (const [name, inputDef] of Object.entries(input)) {
      result[name] =
        (isParameter(inputDef))
          ? getParameterValue(inputDef, context)
          : resolveInput(context, inputDef)
    }
    return result
  }

  return input
}

function isParameter (inputDef) {
  return !!inputDef &&
      (typeof inputDef === 'string' ||
         (typeof inputDef === 'object' && inputDef.path && inputDef.default))
}

// parameter: string || { path, default }
function getParameterValue (parameter, context) {
  const path = parameter.path || parameter

  let value = (path[0] === '.') ? JSPath.apply(path, context) : path

  // console.log('****', path, context, value);

  // Use the default value when necessary
  if (!value) { value = parameter.default }

  return value
}

// todo: move to connect_middleware !
function faultHandler (context, error) {
  debug('default errorHandler: %s', error.stack ? error.stack : error.message)
  if (context.response) {
    context.response.statusCode = 500
    context.response.end(error.message)
  }
}
