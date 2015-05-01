var mesh    = require("mesh");
var through = require("obj-stream").through;

/**
 */

module.exports = function(onMessage, emitOperation, localBus) {
  return _createClient(onMessage, emitOperation, localBus);
};


var _i = 0;

function _createRemoteId() {
  return ++_i;
}

/**
 */

function _createClient(onMessage, emitOperation, localBus) {

  var openOperations = {};

  function _cleanup(operation) {
    delete openOperations[operation.rid];
  }

  function _request(operation) {

    if (!operation.req) return;

    var stream = localBus(operation);

    if (operation.resp !== false) {
      stream.pipe(through(function(data, next) {
        emitOperation(mesh.op("data", { resp: operation.req, data: data }));
        next();
      }, function() {
        emitOperation(mesh.op("end", { resp: operation.req }));
      })).on("error", function(err) {
        emitOperation(mesh.op("error", { resp: operation.req, data: { message: err.message } }));
      });
    }

    return stream;
  }

  function _response(open, operation) {
    if (operation.name === "data") {
      open.stream.write(operation.data);
    } else if (operation.name === "end") {
      open.stream.end();
    } else if (operation.name === "error") {
      open.stream.emit("error", new Error(operation.data.message));
    }
  }

  onMessage(function(message) {
    var open = openOperations[message.resp];

    if (!open) {
      return _request(message);
    }

    _response(open, message);
  });


  return mesh.stream(function(operation, stream) {

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

      stream.once("error", _cleanup.bind(this, operation.req))
      .once("end", _cleanup.bind(this, operation.req));
    } else {
      stream.end();
    }

    emitOperation(operation);
  });
}
