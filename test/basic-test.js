var expect       = require("expect.js");
var ros          = require("../lib");
var mesh         = require("mesh");
var EventEmitter = require("events").EventEmitter;

describe(__filename + "#", function() {

  it("can create a bus", function() {
    ros(mesh.noop, function() { }, mesh.noop);
  });


  it("can return data from a remote source", function(next) {
    var em = new EventEmitter();

    var bus = ros(em.on.bind(em, "message"), em.emit.bind(em, "message"), mesh.stream(function(operation, stream) {
      stream.end("data");
    }));

    var data;

    bus(mesh.op("load")).on("data", function(d) {
      data = d;
    }).on("end", function() {
      expect(data).to.be("data");
      next();
    });
  });

  it("properly sends back an error", function(next) {
    var em = new EventEmitter();

    var bus = ros(em.on.bind(em, "message"), em.emit.bind(em, "message"), mesh.wrap(function(operation, next) {
      next(new Error("error!"));
    }));


    bus(mesh.op("load")).on("error", function(err) {
      expect(err.message).to.be("error!");
      next();
    });
  });


  it("ignores remote operations from being re-used", function(next) {
    var em = new EventEmitter();

    var bus = ros(em.on.bind(em, "message"), em.emit.bind(em, "message"), mesh.stream(function(operation, stream) {
      bus(operation).pipe(stream);
    }));

    bus(mesh.op("load")).on("end", function() {
      next();
    });
  });

  it("can flag an operation to not look for a response", function(next) {
    var em = new EventEmitter();

    var bus = ros(em.on.bind(em, "message"), em.emit.bind(em, "message"), mesh.wrap(function(operation, next) {
      next(void 0, "abba");
    }));


    var _i = 0;

    bus(mesh.op("load", { resp: false })).on("data", function() {
      _i++;
    }).on("end", function() {
      expect(_i).to.be(0);
      next();
    });
  });
});
