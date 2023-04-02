/**
 * Copyright Gallimberti Telemaco 02/02/2017
 **/

module.exports = function(RED) {
  const { Server } = require("socket.io");
  const jwt = require("jsonwebtoken");
  var io;
  var customProperties = {};
  var sockets = [];
  var callbacks = [];
  var setupRan = false;
  var currentJWT = null;

  function socketIoConfig(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    this.port = n.port || 80;
    this.sendClient = n.sendClient;
    this.path = n.path || "/socket.io";
    this.bindToNode = n.bindToNode || false;    
    this.corsOrigins = n.corsOrigins || "*";
    this.corsMethods = n.corsMethods.toUpperCase().split(",") || "GET,POST";
    this.enableCors = n.enableCors || false;
 

    node.log("socketIoConfig - CORS METHODS " + JSON.stringify(this.corsMethods));
    node.log("socketIoConfig - CORS ORIGINS " + JSON.stringify(this.corsOrigins));
    node.log("socketIoConfig - CORS METHODS " + JSON.stringify(this.enableCors));

    let corsOptions = {};
    
    if (this.enableCors) {
      corsOptions = {
        cors: {
          origin: this.corsOrigins,
          methods: this.corsMethods
        }
      };
    }
  
  // if binding to same port as NR avoids handle server.handleUpgrade() issues
  if(!setupRan || !this.bindToNode){
    if (this.bindToNode) {      
      io = new Server(RED.server, corsOptions);
    } else {            
      io = new Server(corsOptions);
      
      io.serveClient(node.sendClient);
      io.path(node.path);
      io.listen(node.port);
    }
    var bindOn = this.bindToNode
      ? "bind to Node-red port"
      : "on port " + this.port;
    node.log("Created server " + bindOn);
  }else{
    console.log("Node red needs restarting");
  }

    node.on("close", function() {
      console.log("closing socket server");
      if (!this.bindToNode) {
        io.close();
      }else{
        // wont restart node red when the server is bind to node red but avoids node red crashing.
        setupRan = true;
      }
      sockets.forEach(function (socket) {
        node.log('disconnect:' + socket.id);
        socket.disconnect(true);
      });
      sockets = [];
      console.log("socket server closed");
    });
    
  }

  function socketIoIn(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    this.name = n.name;
    this.server = RED.nodes.getNode(n.server);
    this.rules = n.rules || [];
    this.jwtkey = n.jwtkey || false;
    node.status({ fill: 'red', shape: 'ring', text: "Disconnected"});

    this.specialIOEvent = [
      // Events emitted by the Manager:
      { v: "open", c: "false" },
      { v: "error", c: "false" },
      { v: "close", c: "false" },
      { v: "ping", c: "false" },
      { v: "packet", c: "false" },
      { v: "reconnect_attempt", c: "false" },
      { v: "reconnect", c: "false" },
      { v: "reconnect_error", c: "false" },
      { v: "reconnect_failed", c: "false" },
      
      // Events emitted by the Socket:
      { v: "connect", c: "false" },
      { v: "connect_error", c: "false" },
      { v: "disconnect", c: "false" }
    ];

    function addListener(socket, val, i) {
      if(val.c == "false"){
        socket.on(val.v, function(msgin) {
          node.status({ fill: 'green', shape: 'ring', text: 'Incoming ' + val.v});
          var msg = {};
          RED.util.setMessageProperty(msg, "payload", msgin, true);
          RED.util.setMessageProperty(msg, "socketIOEvent", val.v, true);
          RED.util.setMessageProperty(msg, "socketIOId", socket.id, true);
          if (
            customProperties[RED.util.getMessageProperty(msg, "socketIOId")] !=
            null
          ) {
            RED.util.setMessageProperty(
              msg,
              "socketIOStaticProperties",
              customProperties[RED.util.getMessageProperty(msg, "socketIOId")],
              true
            );
          }
          node.send(msg);
        });
      }else{
        socket.on(val.v, (msgin, callback) => {
          node.status({ fill: 'green', shape: 'ring', text: 'Incoming ' + val.v});
          callbacks[val.v] = callback;
          var msg = {};
          RED.util.setMessageProperty(msg, "payload", msgin, true);
          RED.util.setMessageProperty(msg, "socketIOEvent", val.v, true);
          RED.util.setMessageProperty(msg, "socketIOId", socket.id, true);
          if (
            customProperties[RED.util.getMessageProperty(msg, "socketIOId")] !=
            null
          ) {
            RED.util.setMessageProperty(
              msg,
              "socketIOStaticProperties",
              customProperties[RED.util.getMessageProperty(msg, "socketIOId")],
              true
            );
          }
          node.send(msg);
        });
      }
    }
    
    if(this.jwtkey != false){
      // check if setup already ran if it has setup will contain JWT
      if(!setupRan || !this.bindToNode){
        // middleware authentication check
        io.use((socket, next) => {
          console.log('Checking JWT');
          if(socket.handshake.auth){
            const { token } = socket.handshake.auth;
            try {
                const decoded = jwt.verify(token, this.jwtkey);
                next();
              } catch (err) {
                console.log('Incorrect JWT');
                node.status({ fill: 'red', shape: 'ring', text: 'Incorrect JWT' });
                return next(new Error("Incorrect JWT"));
                
            }
          }
        });
        currentJWT = this.jwtkey;
      }else{
        if(this.jwtkey != currentJWT){
          node.status({ fill: 'red', shape: 'ring', text: 'JWT Update restart NR' });
        }
      }
     
    } 
    
    //if(!setupRan){
      console.log("setting up");
      io.on("connection", function(socket) {
        node.status({ fill: 'green', shape: 'ring', text: 'Connected'});

        sockets.push(socket);

        node.rules.forEach(function(val, i) {
          addListener(socket, val, i);
        });
        //Adding support for all other special messages
        node.specialIOEvent.forEach(function(val, i) {
          addListener(socket, val, i);
        });

        socket.on("connect_error", (err) => {
          node.status({ fill: 'red', shape: 'ring', text: "error connecting see console"});
          console.log(`connect_error due to ${err.message}`);
        });
      });
      setupRan = true;
    //}else{
    //  console.log("setup already ran");
 
    //}


  }

  function socketIoOut(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    this.name = n.name;
    this.server = RED.nodes.getNode(n.server);

    node.on("input", function(msg) {
      //check if we need to add properties
      if (RED.util.getMessageProperty(msg, "socketIOAddStaticProperties")) {
        //check if we have already added some properties for this socket
        if (
          customProperties[RED.util.getMessageProperty(msg, "socketIOId")] !=
          null
        ) {
          //check if object as property
          var keys = Object.getOwnPropertyNames(
            RED.util.getMessageProperty(msg, "socketIOAddStaticProperties")
          );
          var tmp =
            customProperties[RED.util.getMessageProperty(msg, "socketIOId")];
          for (var i = 0; i < keys.length; i++) {
            tmp[keys[i]] = RED.util.getMessageProperty(
              msg,
              "socketIOAddStaticProperties"
            )[keys[i]];
          }
        } else {
          //add new properties
          customProperties[
            RED.util.getMessageProperty(msg, "socketIOId")
          ] = RED.util.getMessageProperty(msg, "socketIOAddStaticProperties");
        }
      }

	
      switch (RED.util.getMessageProperty(msg, "socketIOEmit")) {
        case "broadcast.emit":
          //Return to all but the caller
          if (
            io.sockets.sockets.get(RED.util.getMessageProperty(msg, "socketIOId"))
          ) {
            io.sockets.sockets.get(
              RED.util.getMessageProperty(msg, "socketIOId")
            ).broadcast.emit(msg.socketIOEvent, msg.payload);
          }
          break;
        case "emit":
          //Return only to the caller
          if (
            io.sockets.sockets.get(RED.util.getMessageProperty(msg, "socketIOId"))
          ) {
            io.sockets.sockets.get(
              RED.util.getMessageProperty(msg, "socketIOId")
            ).emit(msg.socketIOEvent, msg.payload);
          }
          break;
        case "room":
          //emit to all
          if (msg.room) {
            io.to(msg.room).emit(msg.socketIOEvent, msg.payload);
          }
          break;
        default:
          //emit to all
          io.emit(msg.socketIOEvent, msg.payload);
      }
    });
  }

  function socketIoJoin(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    this.name = n.name;
    this.server = RED.nodes.getNode(n.server);

    node.on("input", function(msg) {
      if (io.sockets.sockets.get(RED.util.getMessageProperty(msg, "socketIOId"))) {
        io.sockets.sockets.get(RED.util.getMessageProperty(msg, "socketIOId")).join(
          msg.payload.room
        );
        node.send(msg);
      }
    });
  }
  
  function socketIoRooms(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    this.name = n.name;
    this.server = RED.nodes.getNode(n.server);

    node.on("input", function(msg) {
      node.send({ payload: io.sockets.adapter.rooms });
    });
  }
  
  function socketIoLeave(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    this.name = n.name;
    this.server = RED.nodes.getNode(n.server);

    node.on("input", function(msg) {
      if (io.sockets.sockets.get(RED.util.getMessageProperty(msg, "socketIOId"))) {
        io.sockets.sockets.get(
          RED.util.getMessageProperty(msg, "socketIOId")
        ).leave(msg.payload.room);
      }
    });
  }

  function listenerCallback(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    this.listenerName = n.listenerName;

    node.on('input', (msg) => {
      // unknown issue valueof works fine, but throws console error. 
      let message = msg.callback.valueOf();
      if( callbacks[node.listenerName] !== undefined ) {
        callbacks[node.listenerName](message);
        node.status({ fill: 'green', shape: 'ring', text: 'Callback Sent ' + message });
      }else{
        node.status({ fill: 'red', shape: 'ring', text: 'Event name must match listener in' });
      }

    });

  }

  RED.nodes.registerType("socketio-config", socketIoConfig);
  RED.nodes.registerType("socketio-in", socketIoIn);
  RED.nodes.registerType("socketio-out", socketIoOut);
  RED.nodes.registerType("socketio-join", socketIoJoin);
  RED.nodes.registerType("socketio-rooms", socketIoRooms);
  RED.nodes.registerType("socketio-leave", socketIoLeave);
  RED.nodes.registerType("socketio-listener-callback", listenerCallback);
};
