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

  it('should load all user fittings', function(done) {
    var dir = path.resolve(__dirname, './fixtures/fittings');
    var userFittingsDirs = [ dir ];
    fs.readdir(dir, function(err, files) {
      if (err) { return done(err); }
      var fittingNames = files.map(function(name) { return name.split('.')[0] });
      var fittings = fittingNames.map(function (name) {
        var fittingDef = {};
        fittingDef[name] = 'nothing';
        return fittingDef;
      });
      var bagpipes = Bagpipes.create({ fittings: fittings }, { userFittingsDirs: userFittingsDirs });
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

  it('should load pre-initialized fittings', function(done) {
    var emitFitting = function create() {
      return function (context, cb) {
        cb(null, 'pre-initialized');
    }};
    var pipe = [ 'emit' ];
    var bagpipes = Bagpipes.create({ pipe: pipe }, {fittings: { emit: emitFitting}});
    var context = {};
    bagpipes.play(bagpipes.getPipe('pipe'), context);
    context.output.should.eql('pre-initialized');
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
  });
  describe('when provided with a done(err,ctx) callback', function() {
    describe('and the pipe flow succeeds', function() {
      it('should pass context to the done', function(done){
        var userFittingsDirs = [ path.resolve(__dirname, './fixtures/fittings') ];
        var pipe = [ 'test', 'test', 'emit', 'test' ];
        var bagpipes = Bagpipes.create({ pipe: pipe }, { userFittingsDirs: userFittingsDirs });
        var context = {};
        bagpipes.play(bagpipes.getPipe('pipe'), context, function(err, context) { 
          context.output.should.eql('test');
          done(err);
        });
      })
    });
    
    describe('and the pipe flow fails', function() {
      it('should pass error and context to the done', function(done){
        var userFittingsDirs = [ path.resolve(__dirname, './fixtures/fittings') ];
        var pipe = [ 'test', 'test', 'emit', 'test', 'error' ];
        var bagpipes = Bagpipes.create({ pipe: pipe }, { userFittingsDirs: userFittingsDirs });
        var context = {};
        bagpipes.play(bagpipes.getPipe('pipe'), context, function(err, context) {
          should(err).be.an.Error;
          context.output.should.eql('test');
          done()
        });
      })
    })    
  })
});
