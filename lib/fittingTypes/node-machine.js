'use strict'

const assert = require('assert')

module.exports = function createFitting (pipes, fittingDef) {
  assert(fittingDef.machinepack, `machinepack is required on fitting: ${fittingDef.name}`)
  assert(fittingDef.machine, `machine is required on fitting: ${fittingDef.name}`)

  const machinepack = require(fittingDef.machinepack)

  const machine = machinepack[fittingDef.machine] || machinepack.find(function (machine) {
    return fittingDef.machine === machine.id
  })

  if (!machine) {
    throw new Error(`unknown machine: ${fittingDef.machinepack} : ${fittingDef.machine}`)
  }

  return function (context, next) {
    machine(context.input, next)
  }
}
