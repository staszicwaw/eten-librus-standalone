import LibrusClient from "../index.js";
import { LibrusError } from "../errors/libruserror.js";
import { APISchoolNotice, APISchoolNotices, ISchoolNotice } from "../types/api-types.js";
import BaseManager from "./baseManager.js";

export class SchoolNoticesManager extends BaseManager {
	constructor(client: LibrusClient) {
		super(client);
	}
	async fetchAll(): Promise<ISchoolNotice[]> {
		const noticeResponse = await this.client.customLibrusRequest("https://api.librus.pl/3.0/SchoolNotices/") as Response;
		// Check if request is OK
		if (!noticeResponse.ok) {
			let errorResponseData;
			try {
				errorResponseData = await noticeResponse.text();
			}
			catch (error) {
				this.client.log(error);
			}
			throw new LibrusError("Unhandled error - Could not fetchAll SchoolNotices", noticeResponse.status, errorResponseData);
		}
		const noticeJson = (await noticeResponse.json() as APISchoolNotices).SchoolNotices;
		return noticeJson;
	}
	async fetch(id: string): Promise<ISchoolNotice> {
		const noticeResponse = await this.client.customLibrusRequest(`https://api.librus.pl/3.0/SchoolNotices/${id}`) as Response;
		// Check if request is OK
		if (!noticeResponse.ok) {
			let errorResponseData;
			try {
				errorResponseData = await noticeResponse.text();
			}
			catch (error) {
				this.client.log(error);
			}
			if (noticeResponse.status === 404) {
				throw new LibrusError("SchoolNotice not found", noticeResponse.status, errorResponseData);
			}
			if (noticeResponse.status === 403) {
				throw new LibrusError("SchoolNotice is forbidden from being viewed", noticeResponse.status, errorResponseData);
			}
			else {
				throw new LibrusError("Unhandled error - Could not get SchoolNotice", noticeResponse.status, errorResponseData);
			}
		}
		// Return and cache if set
		const noticeJson = (await noticeResponse.json() as APISchoolNotice).SchoolNotice;
		return noticeJson;
	}
}