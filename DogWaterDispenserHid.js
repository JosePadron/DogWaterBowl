var gea = require("gea-sdk");
var adapter = require("gea-adapter-usb");
var HID = require('node-hid');
console.log(HID.devices());
var path = '0001:0006:02'  //Makey Makey Path
var device = new HID.HID(path);
var buffertools = require('buffertools');
var buf = new Buffer(42);
buffertools.clear(buf);

var DOWN_KEY = 81;
var UP_KEY = 82;
var LEFT_KEY = 80;
var STATE_FULL = 1
var STATE_FILLING = 2
var previousState = 0

// configure the application
var app = gea.configure({
    address: 0xcb,
    version: [ 0, 0, 1, 0 ]
});

// bind to the adapter to access the bus
app.bind(adapter, function (bus) {
    console.log("bind was successful");
        
    var timer;
    device.on("data", function(data) 
    {
        // console.log(data);
        if(WaterHighLevel(data))
        {
            if(previousState != STATE_FULL)
            {
                if(timer)
                {
                    clearTimeout(timer);
                }
                console.log("WaterHighLevel")
                SendStopWaterDispensingMessage(bus);
                
                previousState = STATE_FULL;
            }
        }
        else if(WaterLowLevel(data) && DogIsDrinkingWater(data))
        {
            if(previousState != STATE_FILLING)
            {
                console.log("WaterLowLevel and DogIsDrinkingWater")
                //Start Timer
                SendStartWaterDispensingMessage(bus);
                // Call the same function again
                timer = setInterval(function () {
                    SendStartWaterDispensingMessage(bus);
                    }, 500);
                previousState = STATE_FILLING;
            }
        }
    });
});

process.on('uncaughtException', function (e)
{
    // Print error
	console.log(e);
});

function FindElementInHidKeyBuffer(buffer, key)
{
    var buf = new Buffer(1);
    buf[0] = key;
    // console.log('buffertools.indexOf(buffer, key, 3)', buffertools.indexOf(buffer, buf, 3));
    // console.log('key',  key);
    return (buffertools.indexOf(buffer, buf, 3) > 0); //Key data start at position 3
}

function WaterHighLevel(buffer)
{
    return(FindElementInHidKeyBuffer(buffer, UP_KEY));
}

function WaterLowLevel(buffer)
{
    return(!FindElementInHidKeyBuffer(buffer, DOWN_KEY));
}

function DogIsDrinkingWater(buffer)
{
    return(FindElementInHidKeyBuffer(buffer, LEFT_KEY));
}
 
function SendDispenseMessage(bus, action)
{
    var subCmd = [9]; //Subcommand to control the light
    // send a message
    bus.send({
        command: 0x70, // Dispense
        data: [action, 0, 0, 0], // Water = 1, stop = 0
        source: 0x02, // Simulate UI
        destination: 0x03 // Door board
    });
    console.log("Dispense message was sent.")
}

function SendStartWaterDispensingMessage(bus)
{
    console.log("Start Dispensing water");
    SendDispenseMessage(bus, 1);
}

function SendStopWaterDispensingMessage(bus)
{
    console.log("Stop Dispenensing water");
    SendDispenseMessage(bus, 0);
}
