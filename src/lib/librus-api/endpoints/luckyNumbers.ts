import LibrusClient from "../index.js";
import { LibrusError } from "../errors/libruserror.js";
import { APILuckyNumbers, LuckyNumbers } from "../types/api-types.js";
import BaseManager from "./baseManager.js";

export class LuckyNumbersManager extends BaseManager {
	constructor(client: LibrusClient) {
		super(client);
	}
	async fetch() {
		const noticeResponse = await this.client.customLibrusRequest("https://api.librus.pl/3.0/LuckyNumbers/") as Response;
		if (!noticeResponse.ok) {
			let errorResponseData;
			try {
				errorResponseData = await noticeResponse.text();
			}
			catch (error) {
				this.client.log(error);
			}
			if (noticeResponse.status === 403) {
				throw new LibrusError("LuckyNumbers endpoint error", noticeResponse.status, errorResponseData);
			}
			else {
				throw new LibrusError("Unhandled error - Could not fetch LuckyNumbers endpoint", noticeResponse.status, errorResponseData);
			}
		}
		const noticeJson: LuckyNumbers = (await noticeResponse.json() as APILuckyNumbers).LuckyNumber;
		return noticeJson;
	}
}