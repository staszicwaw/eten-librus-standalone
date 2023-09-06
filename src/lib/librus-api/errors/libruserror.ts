/**
 * Error type describing Librus errors that can't be handled by the library/are unknown
 * @class
 * @extends Error
 * @param msg Message
 */
export class LibrusError extends Error {
	status: number | unknown;
	body: unknown;
	constructor(msg?: string, status?: number, body?: unknown) {
		super(msg);
		this.status = status;
		this.body = body;
	}
}