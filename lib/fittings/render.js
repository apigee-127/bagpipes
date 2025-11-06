'use strict'

const debug = require('debug')('pipes')
const Mustache = require('mustache')
const path = require('path')
const fs = require('fs')
const assert = require('assert')

module.exports = function create (fittingDef, bagpipes) {
  const viewDirs = bagpipes.config.userViewsDirs
  assert(viewDirs, 'userViewsDirs not configured')

  return function render (context, cb) {
    let input = context.input

    if (typeof input === 'string' && input[0] === '@') {
      const fileName = input.slice(1)
      input = getInput(viewDirs, fileName)
      if (!input) {
        throw new Error(`file not found for ${fittingDef.name} in ${bagpipes.config.userViewsDirs}`)
      }
    }

    const output = Mustache.render(input, context.output)
    cb(null, output)
  }
}

function getInput (viewDirs, fileName) {
  for (let i = 0; i < viewDirs.length; i++) {
    const dir = viewDirs[i]
    const file = path.resolve(dir, fileName)
    try {
      debug('reading mustache file: %s', file)
      return fs.readFileSync(file, 'utf8')
    } catch (err) {
      debug('no mustache file here: %s', file)
    }
  }
  return null
}
