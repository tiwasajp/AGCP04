/* 
* Tomohiro Iwasa, tiwasa@avaya.com, July 2022
* This code is licensed under the MIT License
*/

"use strict";

import restAPI from "./lib/restAPI.js";
const RESTAPI_TIMEOUT = 5000;

import { _stdout, _stdout_log, _stdout_table, _stderror } from "./lib/stdout.js";
const INFO = true;
const DEBUG = true;

export default class BackendAPIs {
	constructor(data) {
		this.data = data;
	};

	// restAPI GET test
	getData() {
		return new Promise(async (resolve, reject) => {
			try {
				if (DEBUG) _stdout(`restAPI getData`);
				await restAPI(
					"http://localhost:8080/getData",
					{
						method: "GET",
						headers: {
							"Content-Type": "application/json",
						},
						json: true,
						timeout: RESTAPI_TIMEOUT,
					}
				).then((data) => {
					if (!data) {
						if (INFO | DEBUG) _stdout(`getData failed`);
						reject({ error: "getData failed" });
						return;
					}
					this.data = data;
					if (DEBUG) _stdout(`getData ${JSON.stringify(this.data)}`);
					resolve(this.data);
				}).catch((error) => {
					if (INFO | DEBUG) _stdout(`getData ${JSON.stringify(error)}`);
					reject({ error: error });
				});
			}
			catch (error) {
				if (INFO | DEBUG) _stdout(`getData ${JSON.stringify(error)}`);
				reject({ error: error });
			}
		});
	}

}



