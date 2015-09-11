'use strict';

var debug = require('debug')('pipes:fittings');
var _ = require('lodash');
var util = require('util');
var assert = require('assert');

module.exports = function createFitting(pipes, fittingDef) {

  assert(fittingDef.machinepack, util.format('machinepack is required on fitting: %j', fittingDef));
  assert(fittingDef.machine, util.format('machine is required on fitting: %j', fittingDef));

  var machinepack = require(fittingDef.machinepack);

  var machine = machinepack[fittingDef.machine] || _.find(machinepack, function(machine) {
      return fittingDef.machine == machine.id;
    });

  if (!machine) {
    throw new Error(util.format('unknown machine: %s : %s', fittingDef.machinepack, fittingDef.machine));
  }

  return function(context, next) {
    machine(context.input, next);
  };
};
