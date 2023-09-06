import LibrusClient from "../index.js";

export default class BaseManager {
	protected client: LibrusClient;
	constructor(client: LibrusClient) {
		this.client = client;
	}
}