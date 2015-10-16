'use strict';

var should = require('should');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var Bagpipes = require('../lib');

describe('bagpipes', function() {

  it('should load all system fittings', function(done) {
    var dir = path.resolve(__dirname, '../lib/fittings');
    fs.readdir(dir, function(err, files) {
      if (err) { return done(err); }
      var fittingNames = files.map(function(name) { return name.split('.')[0] });
      var skipFittings = [ 'onError', 'render', 'read' ]; // these need extra parameters to create
      fittingNames = fittingNames.filter(function(name) { return skipFittings.indexOf(name) < 0 });
      var fittings = fittingNames.map(function (name) {
        var fittingDef = {};
        fittingDef[name] = 'nothing';
        return fittingDef;
      });
      var bagpipes = Bagpipes.create({ fittings: fittings });
      bagpipes.pipes.fittings.pipes.length.should.eql(fittingNames.length);
      done();
    });
  });

  it('should run a pipe with a system fitting', function(done) {
    var pipe = [ { 'emit': 'something' } ];
    var bagpipes = Bagpipes.create({ pipe: pipe });
    var context = {};
    bagpipes.play(bagpipes.getPipe('pipe'), context);
    context.output.should.eql('something');
    done();
  });

  it('should load a fitting from a custom directory', function(done) {
    var userFittingsDirs = [ path.resolve(__dirname, './fixtures/fittings') ];
    var pipe = [ 'emit' ];
    var bagpipes = Bagpipes.create({ pipe: pipe }, { userFittingsDirs: userFittingsDirs });
    var context = {};
    bagpipes.play(bagpipes.getPipe('pipe'), context);
    context.output.should.eql('test');
    done();
  });

  it('should allow user fittings to override system fittings', function(done) {
    var userFittingsDirs = [ path.resolve(__dirname, './fixtures/fittings') ];
    var pipe = [ 'test' ];
    var bagpipes = Bagpipes.create({ pipe: pipe }, { userFittingsDirs: userFittingsDirs });
    var context = {};
    bagpipes.play(bagpipes.getPipe('pipe'), context);
    context.output.should.eql('test');
    done();
  });

  it('should throw errors if no onError handler', function(done) {
    var userFittingsDirs = [ path.resolve(__dirname, './fixtures/fittings') ];
    var pipe = [ 'error' ];
    var bagpipes = Bagpipes.create({ pipe: pipe }, { userFittingsDirs: userFittingsDirs });
    var context = {};
    (function() {
      bagpipes.play(bagpipes.getPipe('pipe'), context)
    }).should.throw.error;
    done();
  });

  it('should handle errors if onError registered', function(done) {
    var userFittingsDirs = [ path.resolve(__dirname, './fixtures/fittings') ];
    var pipe = [ { onError: 'emit'}, 'error' ];
    var bagpipes = Bagpipes.create({ pipe: pipe }, { userFittingsDirs: userFittingsDirs });
    var context = {};
    bagpipes.play(bagpipes.getPipe('pipe'), context);
    context.error.should.be.an.Error;
    context.output.should.eql('test');
    done();
  })
});
