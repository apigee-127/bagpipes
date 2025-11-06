'use strict'

const debug = require('debug')('pipes')
const fs = require('fs')
const assert = require('assert')
const async = require('async')

// todo: redo this as a general "file" operation w/ actions: read, write, ...

module.exports = function create (fittingDef) {
  let searchPaths = fittingDef.searchPaths

  assert(searchPaths, `searchPaths is required on fitting: ${fittingDef.name}`)
  if (typeof searchPaths === 'string') {
    searchPaths = [searchPaths]
  }

  return function read (context, cb) {
    const fileName = context.input

    if (typeof fileName !== 'string') {
      return cb(new Error('Bad input, must be a file name.'))
    }

    // todo: variations.. string vs buffer? utf8 vs other?
    const paths = searchPaths.map(function (path) {
      path.resolve(path, fileName)
    })

    async.detect(paths, fs.exists, function (file) {
      if (!file) {
        return cb(new Error(`file ${fileName} not found in: ${searchPaths}`))
      }
      debug('reading file: %s', file)
      fs.readFile(file, 'utf8', cb)
    })
  }
}
