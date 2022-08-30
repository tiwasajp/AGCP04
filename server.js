/* 
* Tomohiro Iwasa, tiwasa@avaya.com, July 2022
*/

"use strict";

import fs from "fs";
import https from "https";
import http from "http";
import express from "express";
import bodyParser from "body-parser";
import { Server } from "socket.io";
import base64 from 'urlsafe-base64';
import formidable from "formidable";
import fetch from 'node-fetch';

const RESTAPI_TIMEOUT = 5000;

const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

const PORT = 443;
//const PORT = 80;

const SERVER = process.env.SERVER || 'aura.uxportal.jp';
const WORKDIR = process.env.WORKDIR || '/home/AGCP04';

const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set("port", process.env.PORT || PORT);
app.set("view engine", "ejs");
app.set('trust proxy', true);

https.createServer({
	key: fs.readFileSync("/home/share/certificates/private.key"),
	cert: fs.readFileSync("/home/share/certificates/server.crt"),
	ca: fs.readFileSync("/home/share/certificates/ca.crt"),
	requestCert: true,
	rejectUnauthorized: false
}, app).listen(PORT, () => { console.log(`Server listening on port ${PORT}`); });

/*
http.createServer(app).listen(PORT,
	() => {
		console.log(`Server listening on port ${PORT}`);
	});
*/

// GKE health check
app.get('/', (req, resp) => {
	//if (DEBUG) console.log(`/GKE health check`);
	return resp.sendStatus(200);
});

let TRANSFER_TO_NUMBER = null;
const setTransferToNumber = (number) => { TRANSFER_TO_NUMBER = number; };
const getTransferToNumber = () => { return TRANSFER_TO_NUMBER; };

app.post("/webhook", async (req, resp) => {
	console.log();
	console.log(req.body);
	console.log(`intentInfo: ${JSON.stringify(req.body.intentInfo)}`);
	let projectId = req.body.sessionInfo.session.split('/')[1];
	let sessionId = req.body.sessionInfo.session.split('/')[9];
	console.log(`project: ${projectId}`);
	console.log(`session: ${sessionId}`);
	console.log(`confidence: ${req.body.confidence}`);
	console.log(`pageInfo: ${req.body.pageInfo.displayName}`);
	console.log(`tag: ${req.body.fulfillmentInfo.tag}`);
	//console.log(`parameters: ${JSON.stringify(req.body.sessionInfo.parameters))}`);
	console.log(`messages: ${JSON.stringify(req.body.messages)}`);
	console.log(`transcript: ${req.body.transcript}`);
	console.log(`languageCode: ${req.body.languageCode}`);
	//console.log(`payload: ${JSON.stringify(req.body.payload)}`);

	try {
		let interaction = {};
		let text = null;
		let transfer = false;
		let bargein = false;
		switch (req.body.fulfillmentInfo.tag) {
			case 'Start':
				//text = `<speak><audio src="https://${SERVER}/audios/chime.wav"></audio></speak>`;
				text = ``;
				interaction.phoneNumber = req.body.sessionInfo.parameters['avaya-session-telephone'].ani;
				break;
			case 'QueryName':
				if (req.body.sessionInfo.parameters['query-name']) {
					console.log(`query-name: ${req.body.sessionInfo.parameters['query-name']}`);
					interaction.name.query = req.body.sessionInfo.parameters['query-name'];
					//text += `<audio src="https://${SERVER}/audios/chime_down.wav"></audio></speak>`;
					text = ``;
				}
				break;
			case 'QueryAddress':
				if (req.body.sessionInfo.parameters['query-address']) {
					console.log(`query-address: ${req.body.sessionInfo.parameters['query-address']}`);
					text = ``;
				}
				break;
			case 'AnnounceNumber':
				//text = `<speak><audio src="https://${SERVER}/audios/boing_x.wav"></audio>`;
				text += `${req.body.sessionInfo.parameters['query-name']}、${req.body.sessionInfo.parameters['query-address']}の電話番号は<say-as interpret-as=\"characters\">0354321234</say-as>です。 もう一度聞きたければ、もう一度と話してください。または、このまま転送いたしますか？</speak>`;
				break;
			case 'Transfer':
				// 転送先判断・設定
				setTransferToNumber("20015");
				transfer = true;
				break;
			case 'EndSession':
				// フロー終了時の処理を記述
				break;
			case 'CustomerDropped':
				// お客様切断時の処理を記述
				break;
			default:
				break;
		}

		let messages = [];
		if (text) {
			messages.push({ text: { text: [text], }, });
		}
		if (bargein) {
			messages.push({ "barge-in": false, });
		}
		if (transfer) {
			messages.push({
				payload: {
					"avaya_telephony": {
						"transfer": {
							"type": "blind",
							//"transferaudio": `https://${SERVER}/audios/sample1.wav`,
							"maxtime": "600s",
							"dest": `tel:${getTransferToNumber()}`,
							"connecttimeout": "60s"
						},
						"return": {
							"state": "ok"
						}
					},
				},
			});
			transfer = false;
		}
		resp.send({
			fulfillment_response: {
				messages: messages,
			},
		});
		
		console.log(`resp.send ${JSON.stringify(messages)}`);
		if (messages[0] && messages[0].text && messages[0].text.text[0])
			console.log(`messages.text: ${messages[0].text.text[0]}`);
	
	}
	catch (error) {
		console.log(`error ${JSON.stringify(error)}`);
	}
});






