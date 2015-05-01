var expect       = require("expect.js");
var ros          = require("../lib");
var mesh         = require("mesh");
var EventEmitter = require("events").EventEmitter;

describe(__filename + "#", function() {

  it("can create a bus", function() {
    ros(function() {});
  });

  it("tags operations as they're going through the bus", function(next) {


    var b2 = ros(function() {
      return function(op) {
        expect(op.req).to.be(1);
        next();
      }
    });

    b2(mesh.op("a"));
  });

  it("can return data from a remote source", function(next) {
    var em = new EventEmitter();
    var bus = ros(function(handler) {
      em.on("message", handler.intercept(mesh.stream(function(operation, stream) {
        stream.end("data");
      })));

      return function(op) {
        em.emit("message", op);
      };
    });

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
    var bus = ros(function(handler) {

      em.on("message", handler.intercept(mesh.wrap(function(operation, next) {
        next(new Error("error!"));
      })));

      return function(op) {
        em.emit("message", op);
      }
    });


    bus(mesh.op("load")).on("error", function(err) {
      expect(err.message).to.be("error!");
      next();
    });
  });

  it("can have an 'else' handler for the intercept function", function(next) {
    var em = new EventEmitter();

    ros(function(handler) {
      em.on("message", handler.intercept(mesh.noop, function(message) {
        expect(message.text).to.be("abba");
        next();
      }));

      em.emit("message", { text: "abba" });
    });
  });

  it("ignores remote operations from being re-used", function(next) {
    var em = new EventEmitter();
    var bus = ros(function(handler) {

      // should end up with infinite loop
      em.on("message", handler.intercept(mesh.stream(function(operation, stream) {
        bus(operation).pipe(stream);
      })));

      return function(operation) {
        em.emit("message", operation);
      }
    });


    bus(mesh.op("load")).on("end", function() {
      next();
    });
  });

  it("can flag an operation to not look for a response", function(next) {
    var em = new EventEmitter();

    var bus = ros(function(handler) {
      em.on("message", handler.intercept(mesh.wrap(function(operation, next) {
        next(void 0, "abba");
      })))
      return function(operation) {
        em.emit("message", operation);
      };
    });

    var _i = 0;

    bus(mesh.op("load", { resp: false })).on("data", function() {
      _i++;
    }).on("end", function() {
      expect(_i).to.be(0);
      next();
    });
  });
});
