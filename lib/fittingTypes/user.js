'use strict'

const debug = require('debug')('pipes:fittings')
const path = require('path')
const assert = require('assert')

module.exports = function createFitting (pipes, fittingDef) {
  assert(fittingDef.name, `name is required on fitting: ${fittingDef.name}`)

  // If there is pre-initialized fittings modules available, return these
  if (pipes.config.fittings && pipes.config.fittings[fittingDef.name]) {
    debug('loaded user fitting %s from pre-initialized modules', fittingDef.name)
    return pipes.config.fittings[fittingDef.name](fittingDef, pipes)
  }

  if (!pipes.config.userFittingsDirs) { return null }

  for (let i = 0; i < pipes.config.userFittingsDirs.length; i++) {
    const dir = pipes.config.userFittingsDirs[i]

    const modulePath = path.resolve(dir, fittingDef.name)
    try {
      let module = require(modulePath)
      if (module.default && typeof module.default === 'function') {
        module = module.default
      }

      const fitting = module(fittingDef, pipes)
      debug('loaded user fitting %s from %s', fittingDef.name, dir)
      return fitting
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND') { throw err }
      const pathFromError = err.message.match(/'.*?'/)[0]
      const split = pathFromError.split(path.sep)
      if (split[split.length - 1] === fittingDef.name + "'") {
        debug('no user fitting %s in %s', fittingDef.name, dir)
      } else {
        throw err
      }
    }
  }

  if (fittingDef.type !== 'user') {
    return null
  }

  throw new Error('user fitting %s not found in %s', fittingDef, pipes.config.userFittingsDirs)
}
