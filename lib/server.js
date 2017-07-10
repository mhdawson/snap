// Copyright 2015-2017 the project authors as listed in the AUTHORS file.
// All rights reserved. Use of this source code is governed by the
// license that can be found in the LICENSE file.
"use strict";

const fs = require('fs');
const mqtt = require('mqtt');
const path = require('path');
const socketio = require('socket.io');

const BORDERS = 15;
const SNAP_BUTTON_HEIGHT = 33;
const PAGE_WIDTH = 290;

let eventSocket = null;

const Server = function() {
}


Server.getDefaults = function() {
  return { 'title': 'House Alert Data' };
}


let replacements;
Server.getTemplateReplacments = function() {
  if (replacements === undefined) {
    const config = Server.config;
    const pictureHtml = '<img id="latestPicture" src="" WIDTH=270 HEIGHT=270>';
    let height = BORDERS + SNAP_BUTTON_HEIGHT + 280;

    replacements = [{ 'key': '<DASHBOARD_TITLE>', 'value': Server.config.title },
                    { 'key': '<UNIQUE_WINDOW_ID>', 'value': Server.config.title },
                    { 'key': '<PICTURE_HTML>', 'value': pictureHtml },
                    { 'key': '<PAGE_WIDTH>', 'value': PAGE_WIDTH },
                    { 'key': '<PAGE_HEIGHT>', 'value': height }];
  }
  return replacements;
}


let lastUrl = "";
Server.startServer = function(server) {
  const config = Server.config;
  let mqttOptions;
  if (Server.config.mqttServerUrl.indexOf('mqtts') > -1) {
    mqttOptions = { key: fs.readFileSync(path.join(__dirname, 'mqttclient', '/client.key')),
		    cert: fs.readFileSync(path.join(__dirname, 'mqttclient', '/client.cert')),
		    ca: fs.readFileSync(path.join(__dirname, 'mqttclient', '/ca.cert')),
		    checkServerIdentity: function() { return undefined }
    }
  }

  const mqttClient = mqtt.connect(Server.config.mqttServerUrl, mqttOptions);
  eventSocket = socketio.listen(server);

  eventSocket.on('connection', function(client) {
    eventSocket.emit('newpict', lastUrl);
    client.on('snap', function() {
      mqttClient.publish(Server.config.mqttPictRequest, 'take');
    });
    
  });
  
  mqttClient.on('connect',function() {
    mqttClient.subscribe(Server.config.mqttPictResponse);
  });

  mqttClient.on('message', function(topic, message) {
    lastUrl = `${Server.config.pictureUrl}${message}`
    eventSocket.emit('newpict', lastUrl);
  });
}


if (require.main === module) {
  const microAppFramework = require('micro-app-framework');
  microAppFramework(path.join(__dirname), Server);
}
