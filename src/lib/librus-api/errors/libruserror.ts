/**
 * Error type for throwing errors regarding Librus' bullshit
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