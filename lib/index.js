var mesh    = require("mesh");
var through = require("obj-stream").through;

/**
 */

module.exports = function(handler) {
  return _createClient(handler).bus;
};


var _i = 0;

function _createRemoteId() {
  return ++_i;
}

/**
 */

function _createClient(handler) {

  var openOperations = {};

  function _cleanup(operation) {
    delete openOperations[operation.rid];
  }


  var client = {
    bus: mesh.stream(function(operation, stream) {

      // noop
      if (operation.req) {
        return stream.end();
      }

      var end;

      if (operation.resp !== false) {
        openOperations[operation.req = _createRemoteId()] = {
          operation: operation,
          stream: stream
        };
      } else {
        stream.end();
      }

      opHandler(operation);
    }),
    intercept: function(messageHandler, otherHandler) {

      if (!otherHandler) otherHandler = function() { };

      return function(message) {
        var open = openOperations[message.resp];

        if (!open) {
          if (message.req) {

            var stream = messageHandler(message);

            if (message.resp !== false) {
              stream.pipe(through(function(data, next) {
                opHandler(mesh.op("data", { resp: message.req, data: data }));
                next();
              }, function() {
                opHandler(mesh.op("end", { resp: message.req }));
              })).on("error", function(err) {
                opHandler(mesh.op("error", { resp: message.req, data: { message: err.message } }));
              });
            }

            return stream;
          } else {
            return otherHandler.apply(this, arguments);
          }
        }

        if (message.name === "data") {
          open.stream.write(message.data);
        } else if (message.name === "end") {
          _cleanup(message);
          open.stream.end();
        } else if (message.name === "error") {
          _cleanup(message);
          open.stream.emit("error", new Error(message.data.message));
        }
      }
    }
  };

  var opHandler = handler(client);

  return client;
}
