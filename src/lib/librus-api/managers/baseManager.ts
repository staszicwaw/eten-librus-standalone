import LibrusClient from "..";

export default class BaseManager {
	client: LibrusClient;
	constructor(client: LibrusClient) {
		this.client = client;
	}
}