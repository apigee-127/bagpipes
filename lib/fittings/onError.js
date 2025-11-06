'use strict'

const debug = require('debug')('pipes')

module.exports = function create (fittingDef, bagpipes) {
  if (typeof fittingDef.input !== 'string') { throw new Error('input must be a pipe name') }

  try {
    var pipe = bagpipes.getPipe(fittingDef.input)
  } catch (err) {
    const pipeDef = [fittingDef.input]
    pipe = bagpipes.createPipe(pipeDef)
  }

  if (!pipe) {
    const msg = `unknown pipe: ${context.input}`
    console.error(msg)
    throw new Error(msg)
  }

  return function onError (context, cb) {
    debug('setting error handler: %s', context.input)
    context._errorHandler = pipe
    cb()
  }
}
