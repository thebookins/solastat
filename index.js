#!/usr/bin/env node
/*
  Simple example that takes a command line provided serial port destination and routes the output to a file of the same name with .log appended to the port name.

  usage: node uploader.js /dev/ttyUSB0 http://my-site.domain.com

*/
var remoteUrl = process.argv[3]
var apiKey = process.argv[4]
const node = 'hotWater'

var socket = require('socket.io-client')(remoteUrl);

socket.on('connect', function(){});
socket.on('event', function(data){});
socket.on('disconnect', function(){});

var request = require('request');

var SerialPort = require("serialport");
var path = process.argv[2];
var baudrate = 4800;
var data = [0x00, 0x000, 0x00, 0x00, 0x00, 0x000, 0x00, 0x00];
var nextTimeStampSeconds = 0;

var solar, backup;

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
  baudRate: baudrate
});

port.on('open', () => console.log('Port open'));

port.on("data", function (data) {
  for (var i = 0; i < data.length; i++) {
    if (processOctet(data[i])) {
      writeResults();
    }
  }
});

port.on("close", function (data) {
  console.log('closing serial port');
  process.exit(1);
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
  var nowSeconds = Math.floor(Date.now()/1000);
  if (nextTimeStampSeconds == 0) nextTimeStampSeconds = nowSeconds;
  if (nowSeconds >= nextTimeStampSeconds) {
    // var state = {
    //   timestamp: new Date(nowSeconds*1000),
    //   status: {
    //     roof: data[0] + (data[1] << 4) - 50,
    //     tank: data[2] + (data[3] << 4) - 50,
    //     inlet: data[4] + (data[5] << 4) - 50,
    //     solar: data[6],
    //     backup: data[7]
    //   }
    if (data[6] != solar) {
      solar = data[6];
      let path = `/input/post?node=${node}&time=${nowSeconds}&fulljson=${JSON.stringify({solar})}&apikey=${apiKey}` // You'll need to put in your API key here from EmonCMS
      request(remoteUrl + path, function (error, response, body) {
        console.log('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
      });
    }
    if (data[7] != backup) {
      backup = data[7];
      let path = `/input/post?node=${node}&time=${nowSeconds}&fulljson=${JSON.stringify({backup})}&apikey=${apiKey}` // You'll need to put in your API key here from EmonCMS
      request(remoteUrl + path, function (error, response, body) {
        console.log('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
      });
    }
  }
//    state.pump += ((state.solar == 2) || (state.pump == 3));
    // socket.emit('state', state);
    // console.log(state);
  if ((nowSeconds % 60) == 0) {
    // should really be averaging state before posting ???
    // or post events to remote url in addition to temperature?
    // e.g. solar and backup on and off events
    // set content-type header and data as json in args parameter
    // var args = {
    //     node: 1,
    //     data: {"roof": 100, "tank": 100, "inlet": 100},
    //     apikey: apiKey,
    //     headers: { "Content-Type": "application/json" }
    // };
    var temperatures = {
      roof: data[0] + (data[1] << 4) - 50,
      tank: data[2] + (data[3] << 4) - 50,
      inlet: data[4] + (data[5] << 4) - 50,
    }

    let path = `/input/post?node=${node}&time=${nowSeconds}&fulljson=${JSON.stringify(temperatures)}&apikey=${apiKey}` // You'll need to put in your API key here from EmonCMS

    request(remoteUrl + path, function (error, response, body) {
      console.log('error:', error); // Print the error if one occurred
      console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
      console.log('body:', body); // Print the HTML for the Google homepage.
    });
  }
  nextTimeStampSeconds++;
}
