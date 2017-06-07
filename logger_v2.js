/*
  Simple example that takes a command line provided serial port destination and routes the output to a file of the same name with .log appended to the port name.
  
  usage: node logger.js /dev/ttyUSB0
  
*/

var $ = jQuery = require('jquery');
require('./jquery.csv-0.71.min.js');

// it might be best to use tiny-router here instead of express
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var SerialPort = require("serialport");
var fs = require("fs");
var port = process.argv[2];
var baudrate = 4800;
var active = false;
var data = [0x00, 0x000, 0x00, 0x00, 0x00, 0x000, 0x00, 0x00];
var nextTimeStampSeconds = 0;
var timezoneOffset = -36000000;
var state = {};
state.pump = 0;

// demo code for writing current time to 8 x 1 LCD (from https://www.npmjs.com/package/lcd)
var Lcd = require('lcd'),
  lcd = new Lcd({rs: 7, e: 8, data: [25, 24, 23, 18], cols: 8, rows: 1});
 
lcd.on('ready', function () {
  setInterval(function () {
    lcd.setCursor(0, 0);
    var output = new Date().toISOString().substring(11, 19);
    lcd.print(output);
    console.log(output);
  }, 1000);
});

// If ctrl+c is hit, free resources and exit.
process.on('SIGINT', function() {
  lcd.clear();
  lcd.close();
  process.exit();
});

app.use(express.static('static'));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.get('/data', function(req, res) {
  res.sendFile(__dirname + '/ttyUSB0.log');
});

io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

http.listen(3000, function() {
  console.log('listening on *:3000');
});

function sendData() {
}

function attemptLogging(fd, port, baudrate) {
  if (!active) {
    fs.stat(port,  function (err, stats) {
      if (!err) {
        var serialPort = new SerialPort.SerialPort(port, {
          baudrate: baudrate
        });
//        fs.write(fd, "\n------------------------------------------------------------\nOpening SerialPort: "+target+" at "+Date.now()+"\n------------------------------------------------------------\n");
        serialPort.on("data", function (data) {        
          for (var i = 0; i < data.length; i++) {
            if (processOctet(data[i])) {
              writeResults(fd);
              active = true;
            }
          }
        });
        serialPort.on("close", function (data) {
          active = false;
//          fs.write(fd, "\n------------------------------------------------------------\nClosing SerialPort: "+target+" at "+Date.now()+"\n------------------------------------------------------------\n");
        });
      }
    });
  }
}

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

function writeResults(fd) {
  if (!active) return;
  var nowSeconds = Math.floor(Date.now()/1000);
  if (nextTimeStampSeconds == 0) nextTimeStampSeconds = nowSeconds;
  if (nowSeconds >= nextTimeStampSeconds) {
  // consider whether to use this time (corrected for daylight savings) or ‘solar’ time
    state.timestamp = new Date(nowSeconds*1000 - timezoneOffset).toISOString().replace(/T/, ' ').replace(/\..+/, '');
    state.roof = data[0] + (data[1] << 4) - 50;
    state.tank = data[2] + (data[3] << 4) - 50;
    state.inlet = data[4] + (data[5] << 4) - 50;
    state.solar = data[6];
    state.backup = data[7];
    state.pump += ((state.solar == 2) || (state.pump == 3));
    io.emit('state', state);
    if ((nowSeconds % 10) == 0) {
//      fs.write(fd, state.timestamp + '\t' + state.roof + '\t' + state.tank + '\t' + state.inlet + '\t' + state.solar + '\t' + state.backup + '\n');
      var csvString = nowSeconds + ',' + state.roof + ',' + state.tank + ',' + state.inlet + ',' + state.solar + ',' + state.backup + '\n';
      fs.write(fd, csvString);
      io.emit('chart', csvString);
    }
    nextTimeStampSeconds ++;
  }
}

if (!port) {
  console.log("You must specify a serial port location.");
} else {
  var target = port.split("/");
  target = target[target.length-1]+".log";
  if (!baudrate) {
    baudrate = 115200;
  }
  fs.open("./"+target, 'a', function (err, fd) {
    setInterval(function () {
      if (!active) {
        try {
          attemptLogging(fd, port, baudrate);  
        } catch (e) {
          // Error means port is not available for listening.
          active = false;
        }
      }
    }, 1000);
  });
}