/*
  Simple example that takes a command line provided serial port destination and routes the output to a file of the same name with .log appended to the port name.
  
  usage: node logger.js /dev/ttyUSB0
  
*/

var SerialPort = require("serialport");
var fs = require("fs");
var port = process.argv[2];
var baudrate = 4800;
var active = false;
var data = [0x00, 0x000, 0x00, 0x00, 0x00, 0x000, 0x00, 0x00];
var nextTimeStampSeconds = 0;
var timezoneOffset = -36000000;

function attemptLogging(fd, port, baudrate) {
  if (!active) {
    fs.stat(port,  function (err, stats) {
      if (!err) {
        var serialPort = new SerialPort.SerialPort(port, {
          baudrate: baudrate
        });
        fs.write(fd, "\n------------------------------------------------------------\nOpening SerialPort: "+target+" at "+Date.now()+"\n------------------------------------------------------------\n");  
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
          fs.write(fd, "\n------------------------------------------------------------\nClosing SerialPort: "+target+" at "+Date.now()+"\n------------------------------------------------------------\n");  
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
    var timestamp = new Date(nowSeconds*1000 - timezoneOffset).toISOString().replace(/T/, ' ').replace(/\..+/, '');
    var roof = data[0] + (data[1] << 4) - 50;
    var tank = data[2] + (data[3] << 4) - 50;
    var inlet = data[4] + (data[5] << 4) - 50;
    var solar = data[6];
    var backup = data[7];
    fs.write(fd, timestamp + '\t' + roof + '\t' + tank + '\t' + inlet + '\t' + solar + '\t' + backup + '\n');
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
  fs.open("./"+target, 'w', function (err, fd) {
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
