var util=require('util');
var mqtt=require('mqtt');
var http = require('http');
const commandLineArgs = require('command-line-args')
var lastData = 0;

const optionDefinitions = [
	{ name: 'mqtthost', alias: 'm', type: String, defaultValue: "ehz-gw" },
	{ name: 'mqttclientid', alias: 'c', type: String, defaultValue: "InverterCooler" },
	{ name: 'goodweid', alias: 'g', type: String, defaultValue: "9010KETU219W0414" },
	{ name: 'tasmotahost', alias: 't', type: String, defaultValue: "tasmota-0c232e-0814" },
	{ name: 'ontemp', alias: 'o', type: Number, defaultValue: "40.0" },
	{ name: 'offtemp', alias: 'f', type: Number, defaultValue: "35.0" },
	{ name: 'interval', alias: 'i', type: Number, defaultValue: "60" },
	{ name: 'debug', alias: 'd', type: Boolean, defaultValue: false }
  ];

const options = commandLineArgs(optionDefinitions)

console.log("MQTT host     : " + options.mqtthost);
console.log("MQTT Client ID: " + options.mqttclientid);

function switchCooler(state) {
	if(options.debug) {
		console.log("switchCooler: "+state);
	}
	var httpopt = {
		host: options.tasmotahost,
		path: '/cm?cmnd=power%20'+(state==1?"on":"off")
	};
//	console.log(util.inspect(httpopt));
	http.request(httpopt, (res) => {
		if(options.debug) {
			console.log("done")
		}
	}).end();
}

var MQTTclient = mqtt.connect("mqtt://"+options.mqtthost,{clientId: options.mqttclientid});
	MQTTclient.on("connect",function(){
	if(options.debug) {
		console.log("MQTT connected");
	}
})

MQTTclient.on("error",function(error){
		console.log("Can't connect" + error);
		process.exit(1)
	});

MQTTclient.subscribe("GoodWe/#");

MQTTclient.on('message',function(topic, message, packet){
	const obj = JSON.parse(message);
	if(topic.includes(options.goodweid)) {
		lastData = Date.now();
		var temp = obj['AirTemperature'];
		if(!temp) {
			temp = obj['Temperature'];
		}
		if(options.debug) {
			console.log("RadiatorTemperature: "+obj['RadiatorTemperature']);
			console.log("AirTemperature     : "+obj['AirTemperature']);
			console.log("Temperature     : "+obj['Temperature']);
		}
		if(temp > options.ontemp) {
			switchCooler(1);
		}
		if(temp < options.offtemp) {
			switchCooler(0);
		}
	}
});

function loop() {
	if((Date.now() - lastData) > options.interval*1000) {
		if(options.debug) {
			console.log("stale data, switching fan off"); 
		}
		switchCooler(0);
	}
	setTimeout(loop, options.interval*1000);
}

loop();
