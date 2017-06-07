var SerialPort = require('serialport').SerialPort;

var port = new SerialPort('/dev/ttyUSB0', {
  baudrate: 4800
});

var roof, tank, inlet, solar, backup;

port.on('open', function (){
  console.log('open');
  port.on('data', function(data) {
    for (var i = 0; i < data.length; i++) {
        var payload = data[i] & 0x0f;
        var tag = data[i] >> 4;
        var bits = '';
        var octet = data[i];
        for (var j = 7; j >= 0; j--) {
          var bit = octet & (1 << j) ? 1 : 0;
          bits = bits + bit;
        }
//console.log(Number(tag).toString(16) + ': ' + Number(payload).toString(16) );
//        console.log(Number(octet >> 4).toString(16));
          if (tag == 0x00)
            roof = payload;
          if (tag == 0x01)
            roof = (payload << 4) + roof - 50;
          if (tag == 0x02)
            tank = payload;
          if (tag == 0x03)
            tank = (payload << 4) + tank - 50;
          if (tag == 0x04)
            inlet = payload;
          if (tag == 0x05)
            inlet = (payload << 4) + inlet - 50;
          if (tag == 0x06)
            solar = payload;
          if (tag == 0x0f)
            console.log('roof = ' + roof + ', tank = ' + tank + ', inlet = ' + inlet + ', solar = ' + solar + ', backup = ' + payload);
      }
//        console.log(Number(data[i]).toString(16));
//      console.log('data received: ' + data[i].toString('hex'));
  })
});
