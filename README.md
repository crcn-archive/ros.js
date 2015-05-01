basic RPC system for mesh. Allows you to execute remote operations, and receive responses.

```javascript
var ros = require("ros");
var mesh = require("mesh");
var io   = require("socket.io");

var client = io("http://127.0.0.1");

var localBus = mesh.wrap(function(operation, next) {
  next();
});

var bus = ros(function(handler) {

  // listen on the client for remote operations
  client.on("message", handler.intercept(localBus));

  // handles operations executed locally
  return function(operation) {
    client.emit("message", operation);
  }
});


bus(mesh.op("insert", { data: { name: "blarg" }})).on("data", function() {
  // do stuff
});
```
