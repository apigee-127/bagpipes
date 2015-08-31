'use strict';

var bagpipes = require('./bagpipes');

module.exports = {
  create: create
};

function create(pipesDefs, config) {
  return bagpipes.create(pipesDefs, config);
}
