/*
  Simple example that takes a command line provided serial port destination and routes the output to a file of the same name with .log appended to the port name.

  usage: node logger.js /dev/ttyUSB0

*/

// var $ = jQuery = require('jquery');
// require('./jquery.csv-0.71.min.js');

// var app = require('tiny-router');
// var http = app.listen(3000);
// var io = require('socket.io')(http);
var socket = require('socket.io-client')(process.argv[3]);

socket.on('connect', function(){});
socket.on('event', function(data){});
socket.on('disconnect', function(){});

// var http1 = require('http');

var SerialPort = require("serialport");
// var fs = require("fs");
var port = process.argv[2];
var baudrate = 4800;
var active = false;
var data = [0x00, 0x000, 0x00, 0x00, 0x00, 0x000, 0x00, 0x00];
var nextTimeStampSeconds = 0;
// var timezoneOffset = -39600000; // Sydney DST
// var timezoneOffset = -36000000;
var state = {tank:50};
state.pump = 0;
//var lastDay = Date.now();

// demo code for writing current time to 8 x 1 LCD (from https://www.npmjs.com/package/lcd)
var Lcd = require('lcd'),
  lcd = new Lcd({rs: 7, e: 8, data: [25, 24, 23, 18], cols: 16, rows: 2});

// lcd.on('ready', function () {
//   setInterval(function () {
//     lcd.setCursor(0, 0);
//     var output = new Date().toISOString().substring(11, 19);
// //    output += ' ' + state.tank;
//     lcd.print(output);
//     lcd.once('printed', function () {
//       lcd.setCursor(12, 0);                                  // col 12, row 0
//       var solarChar = ' ';
//       if (state.solar == 1) solarChar = 'T';
//       if (state.solar == 2) solarChar = 'P';
//       if (state.solar == 3) solarChar = 'F';
//       var backupChar = ' ';
//       if (state.backup == 1) backupChar = 'R';
//       if (state.backup == 2) backupChar = 'H';
//       if (state.backup == 3) backupChar = 'S';
//       output = state.tank + solarChar + backupChar;
//       lcd.print(output);
//       lcd.once('printed', function () {
//         lcd.setCursor(0, 1);                                  // col 0, row 1
// //        lcd.print(new Date().toISOString().substring(0, 10)); // print date
//         lcd.print('oli,abbyplay wii'); // print date
//       });
//     });
// //    lcd.setCursor(0, 1);
// //    lcd.print(state.tank);
//   }, 1000);
// });

// If ctrl+c is hit, free resources and exit.
process.on('SIGINT', function() {
  lcd.clear();
  lcd.close();
  process.exit();
});

// app.use('static', {path: __dirname + '/static'});
//
// app.get('/', function(req, res) {
//   fs.readFile(__dirname + '/index.html', 'utf8', function(err, contents) {
//     if (err) {
//       return console.log(err);
//     }
//     res.send(contents);
//   });
// // the express way:
// //  res.sendFile(__dirname + '/index.html');
// });

// app.get('/data', function(req, res) {
//   fs.readFile(__dirname + '/data.log', 'utf8', function(err, contents) {
//     if (err) {
//       return console.log(err);
//     }
//     res.send(contents);
//   });
// //  res.sendFile(__dirname + '/ttyUSB0.log');
// });

// io.on('connection', function(socket){
//   console.log('a user connected');
//   socket.on('disconnect', function(){
//     console.log('user disconnected');
//   });
// });

//http.listen(3000, function() {
//  console.log('listening on *:3000');
//});

// function sendData() {
// }

function attemptLogging(port, baudrate) {
  if (!active) {
    // fs.stat(port,  function (err, stats) {
      // if (!err) {
        var serialPort = new SerialPort.SerialPort(port, {
          baudrate: baudrate
        });
//        fs.write(fd, "\n------------------------------------------------------------\nOpening SerialPort: "+target+" at "+Date.now()+"\n------------------------------------------------------------\n");
        serialPort.on("data", function (data) {
          for (var i = 0; i < data.length; i++) {
            if (processOctet(data[i])) {
              writeResults();
              active = true;
            }
          }
        });
        serialPort.on("close", function (data) {
          active = false;
//          fs.write(fd, "\n------------------------------------------------------------\nClosing SerialPort: "+target+" at "+Date.now()+"\n------------------------------------------------------------\n");
        });
      // }
    // });
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

function writeResults() {
  if (!active) return;
  var nowSeconds = Math.floor(Date.now()/1000);
  if (nextTimeStampSeconds == 0) nextTimeStampSeconds = nowSeconds;
  if (nowSeconds >= nextTimeStampSeconds) {
  // consider whether to use this time (corrected for daylight savings) or ‘solar’ time
    var day = new Date(nowSeconds*1000);
    day.setHours(0,0,0,0);
    // if (day > lastDay) {
    //   // clear contents of file if it's a new day
    //   console.log(day + " is greater than " + lastDay + ", truncating.");
    //   fs.truncate(fd, 0, function(err) {console.log(err);});
    //   lastDay = day;
    // }
    state.timestamp = day.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    state.roof = data[0] + (data[1] << 4) - 50;
    state.tank = data[2] + (data[3] << 4) - 50;
    state.inlet = data[4] + (data[5] << 4) - 50;
    state.solar = data[6];
    state.backup = data[7];
    state.pump += ((state.solar == 2) || (state.pump == 3));
    io.emit('state', state);
    socket.emit('state', state);
    if ((nowSeconds % 60) == 0) {
//      var csvString = nowSeconds + ',' + state.roof + ',' + state.tank + ',' + state.inlet + ',' + state.solar + ',' + state.backup + '\n';
//      fs.write(fd, csvString);
      // TODO: issue a http post
//      io.emit('chart', csvString);
    }
    nextTimeStampSeconds++;
  }
}

if (!port) {
  console.log("You must specify a serial port location.");
} else {
//  var target = port.split("/");
//  target = target[target.length-1]+".log";
  if (!baudrate) {
    baudrate = 115200;
  }
//  fs.open("./data.log", 'a', function (err, fd) {
  setInterval(function () {
    if (!active) {
      try {
        attemptLogging(port, baudrate);
      } catch (e) {
        // Error means port is not available for listening.
        console.log(e);
        active = false;
      }
    }
  }, 1000);
//  });
}
