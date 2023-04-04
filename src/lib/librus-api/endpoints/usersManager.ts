import LibrusClient from "../index.js";
import { LibrusError } from "../errors/libruserror.js";
import { APIUser, APIUsers, IUser } from "../types/api-types.js";
import BaseManager from "./baseManager.js";

export class UsersManager extends BaseManager {
	cache: Map<number, IUser>;
	constructor(client: LibrusClient) {
		super(client);
		this.cache = new Map<number, IUser>();
	}
	async fetch(id: number, force = false): Promise<IUser> {
		const userResponse = await this.client.customLibrusRequest(`https://api.librus.pl/3.0/Users/${id}`) as Response;
		if (!force && this.cache.has(id)) {
			const cached = this.cache.get(id);
			if (cached != null) {
				return cached;
			}
			else {
				this.client.log("IUser object was null when trying to get from cache map. Key was deleted".bgRed.white);
				this.cache.delete(id);
			}
		}
		// Check if request is OK
		if (!userResponse.ok) {
			let errorResponseData;
			try {
				errorResponseData = await userResponse.text();
			}
			catch (error) {
				this.client.log(error);
			}
			if (userResponse.status === 404) {
				throw new LibrusError("User not found", userResponse.status, errorResponseData);
			}
			else if (userResponse.status === 403) {
				throw new LibrusError("User is forbidden from being viewed", userResponse.status, errorResponseData);
			}
			else {
				throw new LibrusError("Unhandled error - Could not get user", userResponse.status, errorResponseData);
			}
		}
		// Return and cache if set
		const user = (await userResponse.json() as APIUser).User;
		if (user.Id !== id)
			throw new LibrusError("Returned user ID mismatches the one passed - THIS SHOULDN'T BE POSSIBLE", userResponse.status, user);
		return user;
	}
	async fetchMany(ids: number[]): Promise<IUser[]> {
		const idCheckArr: number[] = [];
		// Get the ones we already cached (Or not, if force is set to true)
		for (const id of ids) {
			idCheckArr.push(id);
		}
		const returnArr: IUser[] = [];
		// Request, splitting up into separate requests if they are too large
		while (idCheckArr.length > 0) {
			const joinedIds = idCheckArr.splice(0, 29).join(",");
			const usersResponse = await this.client.customLibrusRequest(`https://api.librus.pl/3.0/Users/${joinedIds},`) as Response;
			if (!usersResponse.ok) {
				let errorResponseData;
				try {
					errorResponseData = await usersResponse.text();
				}
				catch (error) {
					this.client.log(error);
				}
				throw new LibrusError("Unhandled error - Could not get multiple users at once", usersResponse.status, errorResponseData);
			}
			const usersJson = await usersResponse.json() as APIUsers;
			for (const user of usersJson.Users) {
				returnArr.push(user);
			}
		}
		return returnArr;
	}
}