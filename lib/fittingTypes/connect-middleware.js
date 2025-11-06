'use strict'

const debug = require('debug')('pipes:fittings')
const path = require('path')
const assert = require('assert')

module.exports = function createFitting (pipes, fittingDef) {
  assert(fittingDef.module, `module is required on fitting: ${JSON.stringify(fittingDef)}`)
  assert(fittingDef.function, `function is required on fitting: ${JSON.stringify(fittingDef)}`)

  for (let i = 0; i < pipes.config.connectMiddlewareDirs.length; i++) {
    const dir = pipes.config.connectMiddlewareDirs[i]

    try {
      const modulePath = path.resolve(dir, fittingDef.module)
      const controller = require(modulePath)
      const fn = controller[fittingDef.function]

      if (fn) {
        debug('using %s controller in %s', fittingDef.module, dir)
        return connectCaller(fn)
      } else {
        debug('missing function %s on controller %s in %s', fittingDef.function, fittingDef.module, dir)
      }
    } catch (err) {
      debug('no controller %s in %s', fittingDef.module, dir)
    }
  }

  throw new Error('controller not found in %s for fitting %j', pipes.config.connectMiddlewareDirs, fittingDef)
}

function connectCaller (fn) {
  return function connect_middleware (context, next) {
    fn(context.request, context.response, function (err) {
      next(err)
    })
  }
}
