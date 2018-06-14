#!/usr/bin/env node

/*
  Simple example that takes a command line provided serial port destination and routes the output to a file of the same name with .log appended to the port name.

  usage: node uploader.js /dev/ttyUSB0 http://my-site.domain.com

*/
var remoteUrl = process.argv[3]

var socket = require('socket.io-client')(remoteUrl);

socket.on('connect', function(){});
socket.on('event', function(data){});
socket.on('disconnect', function(){});

var Client = require('node-rest-client').Client;
var client = new Client();

var SerialPort = require("serialport");
var path = process.argv[2];
var baudrate = 4800;
var data = [0x00, 0x000, 0x00, 0x00, 0x00, 0x000, 0x00, 0x00];
var nextTimeStampSeconds = 0;

if (!path) {
  console.log("You must specify a serial port location.");
  process.exit();
}

// if (!baudrate) {
//   baudrate = 115200;
// }

console.log("-----")
console.log("starting logging session at " + Date())
console.log("-----")

var port = new SerialPort(path, {
  baudrate: baudrate
});

port.on('open', () => console.log('Port open'));

port.on("data", function (data) {
  for (var i = 0; i < data.length; i++) {
    if (processOctet(data[i])) {
      writeResults();
      active = true;
    }
  }
});

port.on("close", function (data) {
  console.log('closing serial port');
  active = false;
});

port.on('error', function (err) {
  console.error('Hmm..., error!');
  console.error(err);
  process.exit(1);
});

function processOctet(octet) {
  var tag = (octet >> 4);
  var payload = (octet & 0x0f);
  if (tag == 0x0f) {
    data[0x07] = payload;
    return true;
  }
  data[tag] = payload;
  return false;
}

function writeResults() {
  if (!active) return;
  var nowSeconds = Math.floor(Date.now()/1000);
  if (nextTimeStampSeconds == 0) nextTimeStampSeconds = nowSeconds;
  if (nowSeconds >= nextTimeStampSeconds) {
    var state = {
      timestamp: new Date(nowSeconds*1000),
      status: {
        roof: data[0] + (data[1] << 4) - 50,
        tank: data[2] + (data[3] << 4) - 50,
        inlet: data[4] + (data[5] << 4) - 50,
        solar: data[6],
        backup: data[7]
      }
    }
//    state.pump += ((state.solar == 2) || (state.pump == 3));
    socket.emit('state', state);
    if ((nowSeconds % 60) == 0) {
      // should really be averaging state before posting ???
      // or post events to remote url in addition to temperature?
      // e.g. solar and backup on and off events
      // set content-type header and data as json in args parameter
      var args = {
          data: state,
          headers: { "Content-Type": "application/json" }
      };

      client.post(remoteUrl + '/api/entries', args, function (data, response) {
        // TODO: check if the post was successful?
        // not sure what to do if not
      });
    }
    nextTimeStampSeconds++;
  }
}
