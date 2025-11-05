'use strict'

const util = require('util')
const assert = require('assert')

module.exports = function createFitting (pipes, fittingDef) {
  assert(fittingDef.machinepack, util.format('machinepack is required on fitting: %j', fittingDef))
  assert(fittingDef.machine, util.format('machine is required on fitting: %j', fittingDef))

  const machinepack = require(fittingDef.machinepack)

  const machine = machinepack[fittingDef.machine] || machinepack.find(function (machine) {
    return fittingDef.machine === machine.id
  })

  if (!machine) {
    throw new Error(util.format('unknown machine: %s : %s', fittingDef.machinepack, fittingDef.machine))
  }

  return function (context, next) {
    machine(context.input, next)
  }
}
