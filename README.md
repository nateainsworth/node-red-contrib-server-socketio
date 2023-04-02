# node-red-contrib-socketio-jwt
Implementation for [Node-RED](https://nodered.org/) of the popular [Socket.IO](http://socket.io/).

from the javis86 version of the original project node-red-contrib-socketio



## Installation
To install node-red-contrib-socketio use this command

`npm i node-red-contrib-socketio-server-jwt`

## Composition
The Socket.IO implementation is made with
* 1 configuration Node that holds the server definitions and the user can decide to bind the SocketIO server on the Node-RED port or bind it to another port
* 1 input node where the user adds all the `topic`s in which they are interested featuring a callback tickbox for use with listener callbacks. By default callback is off.
* 1 output node that sends the data received into `msg.payload`
* 1 node to join a Socket IO room
* 1 node to leave a Socket IO room
* 1 node to send callbacks for listener events, make sure to check callback in input node for using this node

## Usage
Note: When using the bind option to run on Node Reds port, JWT tokens wont be updated when deploying as the server will still be running on with the previous setup. Otherwise closing the server would also close node red every time you click deploy. Listener events will be updated however so it will be unlikely to effect you. If running on a different port the server will restart updating JWT setups.

To see an example usage go to [Example Chat App](https://flows.nodered.org/flow/71f7da3a14951acb67f94bac1f71812a)

> Socket.IO Setup
![How to use](https://raw.githubusercontent.com/nateainsworth/Git-docs-images/master/node-red-contrib-socketio-server/socketio-in-setup.png "How to use listener callbacks")

> Socket.IO In -> Handle Event -> Handle payload -> Socket.IO Callback Out
![How to use](https://raw.githubusercontent.com/nateainsworth/Git-docs-images/master/node-red-contrib-socketio-server/callbacks-example.png "How to use node socket In with JWT")
See 'Socketio In' node for docs on client side setup examples


## License
MIT

## Thanks
Thank to: 
* @nexflo for translating the comments in English and for pre-sending control data 
* @bimalyn-IBM for implementig rooms
* @essuraj for implementig rooms listing node
* @cazellap for pushong adding compatibility to socketIO 3.0
* @javis86 individual contributor for fixing node-red hangs when deploy flows
* @nateainsworth individual contributor adding callbacks for listeners, JWT authentication and node status messages


