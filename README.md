# Solastat

Monitoring for Solastat hot water system controller.

## Installation
```text
npm install
sudo npm link
```

## Calling
```
solastat
```

## Cron scheduling
Something like this will keep the job up in the case of errors:
```text
* * * * * /usr/bin/flock -n /tmp/solastat.lockfile solastat /dev/ttyUSB0 http://REMOTE_URL >> /home/pi/solastat.log 2>&1
```

Note: Sometimes the path to the USB serial port changes (e.g. from `ttyUSB0` to `ttyUSB1`). According to [this answer](https://raspberrypi.stackexchange.com/a/13123) it might be more stable to use the `/dev/serial/by-id/*` path instead.
