'use strict'

module.exports = function create () {
  return function first (context, cb) {
    cb(null, context.output[0])
  }
}
