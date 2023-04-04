import LibrusClient from "../index.js";
import { LibrusError } from "../errors/libruserror.js";
import { APICalendarsTeacherFreeDay, ITeacherFreeDay } from "../types/api-types.js";
import BaseManager from "./baseManager.js";

export class CalendarsManager extends BaseManager {
	teacherFreeDays: TeacherFreeDaysManager;
	constructor(client: LibrusClient) {
		super(client);
		this.teacherFreeDays = new TeacherFreeDaysManager(client);
	}
	// TODO implement fetch, other calendar managers etc.
}

class TeacherFreeDaysManager extends BaseManager {
	constructor(client: LibrusClient) {
		super(client);
	}
	async fetch(id: number): Promise<ITeacherFreeDay> {
		const noticeResponse = await this.client.customLibrusRequest(`https://api.librus.pl/3.0/Calendars/TeacherFreeDays/${id}`) as Response;
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
				throw new LibrusError("TeacherFreeDay not found", noticeResponse.status, errorResponseData);
			}
			if (noticeResponse.status === 403) {
				throw new LibrusError("TeacherFreeDay is forbidden from being viewed", noticeResponse.status, errorResponseData);
			}
			else {
				throw new LibrusError("Unhandled error - Could not get TeacherFreeDay", noticeResponse.status, errorResponseData);
			}
		}
		const noticeJson = (await noticeResponse.json() as APICalendarsTeacherFreeDay).TeacherFreeDay;
		return noticeJson;
	}
}