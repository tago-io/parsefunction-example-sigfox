/* This is an a generic payload parser that can be used as a starting point for Sigfox Devices
** The code find the "data" variable, sent by your sensor, and parse it if exists.
** The content of value from variable "data" is always an Hexadecimal value.
**
** Testing:
** You can do manual tests to the parse by using the Device Emulator. Copy and Paste the following JSON:
** [{ "variable": "data", "value": "0109611395000DF9011EB9" }]
*/

// Search the payload variable in the payload global variable. It's contents is always [ { variable, value...}, {variable, value...} ...]
const payload_raw = payload.find(x => x.variable === 'data');

// check if payload_raw exists
if (payload_raw) {
  try {
    // Convert the data from Hex to Javascript Buffer.
    const buffer = Buffer.from(payload_raw.value, 'hex');

    // Lets say you have a payload of 11 bytes.
    // 0 - Counter (1 byte, 0 - 255)
    // 1,2 - Temperature (multiplied by 100, unit = Celsius)
    // 3,4 - Humidity (multiplied by 100, unit = Percent)
    // 5 - Latitude indicator 00 = positive | 01 = negative
    // 6,7 (Latitude value * 10000) / 1000000
    // 8 - Longitude indicator 00 = positive | 01 = negative
    // 9,10 (Longitude value * 10000) / 1000000
    // More information about buffers can be found here: https://nodejs.org/api/buffer.html

    // Latitude indicator
    const lat_indicator = buffer.readInt8(5);
    // longitude indicator
    const lng_indicator = buffer.readInt8(8);

    // Latitude value
    let lat = (buffer.readUInt16BE(6) * 10022) / 1000000;

    // applying indicator rule, if 0 is positive if 1 is negative
    lat = lat_indicator === 0 ? lat : -lat;

    // Longitude value
    let lng = (buffer.readUInt16BE(9) * 10022) / 1000000;

    // applying indicator rule, if 0 is positive if 1 is negative
    lng = lng_indicator === 0 ? lng : -lng;

    const data = [
      { variable: 'counter', value: buffer.readInt8(0) },
      { variable: 'temperature',  value: buffer.readInt16BE(1) / 100, unit: '°C' },
      { variable: 'humidity',  value: buffer.readUInt16BE(3) / 100, unit: '%' },
      { variable: 'location',  value: `${lat}, ${lng}`, location: { lat, lng } },
    ];

    // This will concat the content sent by your device with the content generated in this payload parser.
    // It also add the field "group" and "time" to it, copying from your sensor data.
    payload = payload.concat(data.map(x => ({ ...x, group: payload_raw.serie || payload_raw.group, time: payload_raw.time })));
  } catch (e) {
    // Print the error to the Live Inspector.
    console.error(e);

    // Return the variable parse_error for debugging.
    payload = [{ variable: 'parse_error', value: e.message }];
  }
}
