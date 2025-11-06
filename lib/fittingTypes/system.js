'use strict'

const debug = require('debug')('pipes:fittings')
const path = require('path')
const assert = require('assert')

module.exports = function createFitting (pipes, fittingDef) {
  assert(fittingDef.name, `name is required on fitting: ${fittingDef.name}`)

  const dir = pipes.config.fittingsDir || path.resolve(__dirname, '../fittings')

  const modulePath = path.resolve(dir, fittingDef.name)
  try {
    const module = require(modulePath)
    const fitting = module(fittingDef, pipes)
    debug('loaded system fitting %s from %s', fittingDef.name, dir)
    return fitting
  } catch (err) {
    debug('no system fitting %s in %s', fittingDef.name, dir)
    throw err
  }
}
