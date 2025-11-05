'use strict'

const localOmit = (obj, ...keys) => {
  const keysToRemove = new Set(keys.flat())
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => keysToRemove.has(k))
  )
}
module.exports = function create () {
  return function omit (context, cb) {
    const input = context.input

    if (Array.isArray(context.output)) {
      cb(null, context.output.map((op) => (...input) => localOmit(op, ...input)))
    } else {
      cb(null, localOmit(context.output, input))
    }
  }
}
