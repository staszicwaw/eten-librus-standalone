import "colors";
import makeFetchCookie from "fetch-cookie";
import { LibrusError } from "./errors/libruserror.js";
import { APIPushChanges, APISynergiaAccounts, PostAPIChangeRegister } from "./types/api-types.js";
import { LuckyNumbersManager } from "./endpoints/luckyNumbers.js";
import { SchoolNoticesManager } from "./endpoints/schoolNoticesManager.js";
import { UsersManager } from "./endpoints/usersManager.js";
import { CalendarsManager } from "./endpoints/calendarsManager.js";

interface LibrusRequestOptions {
	fetchOptions?: RequestInit
}

const GLOBAL_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/117.0";

/**
 * Class for easy interaction with the mobile Librus web API
 * @default
 * @class
 */
export default class LibrusClient {
	private bearerToken = "";
	/**
	 * Set if you have an existing pushDevice ID you want to use.
	 *
	 * Otherwise, call `newPushDevice()` after login and let the library handle this for you.
	 */
	public pushDevice = 0;
	private synergiaLogin = "";
	private appUsername = "";
	private appPassword = "";
	private cookieFetch = makeFetchCookie(fetch);
	public readonly users = new UsersManager(this);
	public readonly schoolNotices = new SchoolNoticesManager(this);
	public readonly calendars = new CalendarsManager(this);
	public readonly luckyNumbers = new LuckyNumbersManager(this);
	public readonly debug: boolean = false;
	/**
	 * Create a new Librus API client.
	 * @param debugLogging Print additional debug information to the console
	 * @constructor
	 */
	constructor(debugLogging = false) {
		this.debug = debugLogging;
	}

	/**
	 * Internal log function
	 */
	log(message: unknown) {
		if (this.debug) {
			console.debug(message);
		}
	}

	/**
	 * Login to Librus using your mobile app credentials.
	 * @async
	 * @param username Your Librus app username (This is NOT a Synergia login)
	 * @param password Your Librus app password
	 * @throws {Error} Invalid username/password
	 * @throws {LibrusError}
	 */
	async login(username: string, password: string) {
		if (username.length < 2 || password.length < 2)
			throw new Error("Invalid username or password");
		// Get csrf-token from <meta> tag for future requests
		const result = await this.cookieFetch("https://portal.librus.pl/");
		const resultText = await result.text();
		const csrfTokenRegexResult = /<meta name="csrf-token" content="(.*)">/g.exec(resultText);
		if (csrfTokenRegexResult == null)
			throw new LibrusError("No csrf-token meta tag in <head> of main site", result.status, resultText), console.log(resultText);
		const csrfToken = csrfTokenRegexResult[1];

		// Login
		// Response gives necessary cookies, saved automatically thanks to fetch-cookie
		const loginResult = await this.cookieFetch("https://portal.librus.pl/konto-librus/login/action", {
			method: "POST",
			body: JSON.stringify({
				email: username,
				password: password
			}),
			headers: {
				"Content-Type": "application/json",
				"X-CSRF-TOKEN": csrfToken,
				"User-Agent": GLOBAL_UA
			}
		});
		if (!loginResult.ok)
			throw new LibrusError(`https://portal.librus.pl/konto-librus/login/action ${loginResult.statusText}`, loginResult.status, await loginResult.text());

		// Get the accessToken
		const accountsResult = await this.cookieFetch("https://portal.librus.pl/api/v3/SynergiaAccounts", {
			method: "GET",
			headers: {
				"User-Agent": GLOBAL_UA
			}
		});
		const accountsResultJson = await accountsResult.json() as APISynergiaAccounts;
		if (!accountsResult.ok)
			throw new LibrusError(`https://portal.librus.pl/api/v3/SynergiaAccounts ${loginResult.statusText}`, accountsResult.status, accountsResultJson);
		// TODO: Fix the existence checking here
		if (accountsResultJson.accounts?.[0]?.accessToken == null)
			throw new LibrusError("SynergiaAccounts endpoint returned no accessToken for account", accountsResult.status, accountsResultJson);
		this.bearerToken = accountsResultJson.accounts[0].accessToken;
		if (accountsResultJson.accounts?.[0]?.login == null)
			throw new LibrusError("SynergiaAccounts endpoint returned no login for account", accountsResult.status, accountsResultJson);
		this.synergiaLogin = accountsResultJson.accounts[0].login;
		this.appUsername = username;
		this.appPassword = password;
		this.log(" Librus Login OK ".bgGreen.white);
		return;
	}

	/**
	 * Uses existing cached cookies instead of credentials to try and get bearer token.
	 * Use only if you're using cookies through constructor or session is expired and you don't want to execute login() function.
	 * @async
	 * @throws {LibrusError}
	 */
	async refreshToken() {
		// Get the newer accessToken
		const response = await this.cookieFetch(`https://portal.librus.pl/api/v3/SynergiaAccounts/fresh/${this.synergiaLogin}`,
			{
				method: "GET",
				headers: {
					"User-Agent": GLOBAL_UA
				},
				redirect: "manual"
			}
		);
		let responseText;
		try {
			responseText = await response.text();
		}
		catch (error) {
			console.error(error);
			throw new LibrusError(`Couldn't get response body for https://portal.librus.pl/api/v3/SynergiaAccounts/fresh/${this.synergiaLogin}`, response.status);
		}
		let responseJSON;
		try {
			responseJSON = JSON.parse(responseText);
		}
		catch (error) {
			console.error(error);
			throw new LibrusError(`Body isn't JSON for https://portal.librus.pl/api/v3/SynergiaAccounts/fresh/${this.synergiaLogin}`, response.status, responseText);
		}
		if (!response.ok)
			throw new LibrusError(`refreshToken: ${response.statusText}`, response.status, responseJSON);
		if (responseJSON.accessToken == null)
			throw new LibrusError("GET SynergiaAccounts returned unexpected JSON format", response.status, responseJSON);
		this.bearerToken = responseJSON.accessToken;
		return;
	}

	/**
	 * Creates a request to Librus API using provided link, method, body and returns the JSON data sent back.
	 * This is intended for internal library use, not meant to be used my your app.
	 * @async
	 * @param url API endpoit URL
	 * @param options Additional request options
	 * @throws {LibrusError}
	 */
	async customLibrusRequest(url: string, options?: LibrusRequestOptions) {
		// Merge default request options with user request options
		let requestOptions: RequestInit = {
			method: "GET",
			headers: {
				"User-Agent": GLOBAL_UA,
				gzip: "true", // TODO: Is this necessary?
				Authorization: ((this.bearerToken !== "") ? `Bearer ${this.bearerToken}` : "")
			},
			redirect: "manual"
		};
		if (options?.fetchOptions) {
			requestOptions = { ...requestOptions, ...options.fetchOptions };
			if ("headers" in options.fetchOptions)
				requestOptions.headers = { ...requestOptions.headers, ...options.fetchOptions.headers };
		}

		// Execute request
		this.log(`${requestOptions.method} ${url}`.bgMagenta.white);
		let result = await this.cookieFetch(url, requestOptions);

		// FIXME: This whole if statement sucks and still produces "The body has already been consumed" errors.
		if (!result.ok) {
			this.log("Result not OK".bgYellow.white);
			this.log(`${result.status} ${result.statusText}`.bgYellow.white);
			let resultText = await result.text();
			if (resultText?.length) {
				try {
					this.log(JSON.parse(resultText));
				}
				catch (error) {
					this.log(resultText);
				}
			}
			// Try to refresh if 401
			if (result.status === 401) {
				this.log("Trying to refresh token".bgYellow.white);
				try {
					await this.refreshToken();
				}
				catch (error) {
					this.log(error);
					this.log("Couldn't refresh token, retrying full login".bgRed.white);
					await this.login(this.appUsername, this.appPassword);
				}
				this.log("Retrying request after reauthentication".bgYellow.white);
				(requestOptions.headers as {[key: string]: string}).Authorization = `Bearer ${this.bearerToken}`; // This is stupid
				this.log(`${requestOptions.method} ${url}`.bgMagenta.white);
				result = await this.cookieFetch(url, requestOptions);
				if (!result.ok) {
					resultText = await result.text();
					throw new LibrusError(`${result.status} ${result.statusText} after reauth attempt`, result.status, result.text());
				}
			}
		}
		return result;
	}

	/**
	 * Requests (and automatically saves internally for future use) a new pushDevice ID from librus
	 * @async
	 * @returns Newly acquired pushDevice ID
	 * @throws {LibrusError}
	 */
	async newPushDevice() {
		const response = await this.customLibrusRequest("https://api.librus.pl/3.0/ChangeRegister", {
			fetchOptions: {
				method: "POST",
				body: JSON.stringify({
					sendPush: 0,
					appVersion: "7.0.0"
				})
			}
		}) as Response;
		const jsonResponse = await response.json() as PostAPIChangeRegister;
		if (jsonResponse.ChangeRegister?.Id == null)
			throw new LibrusError("POST ChangeRegister returned unexpected JSON format", response.status, jsonResponse);
		this.pushDevice = jsonResponse.ChangeRegister.Id;
		return this.pushDevice;
	}

	/**
	 * Get changes since last check given our pushDevice
	 *
	 * **NOTE:** To not get repeat changes you have to call the deletePushChanges() method after handling the changes yourself.
	 * @async
	 * @returns Response if OK in member (of type array) "Changes" of returned object.
	 * @throws {LibrusError}
	 */
	async getPushChanges() {
		const response = await this.customLibrusRequest(`https://api.librus.pl/3.0/PushChanges?pushDevice=${this.pushDevice}`) as Response;
		const responseJson = await response.json() as APIPushChanges;
		if (!response.ok)
			throw new LibrusError(`${response.status} ${response.statusText}`, response.status, responseJson);
		if (responseJson?.Code === "UnableToGetPushDevice")
			throw new LibrusError("Unable to get pushDevice. You're probably using a pushDevice ID that's invalid or doesn't belong to you.", response.status, responseJson);
		else if (responseJson?.Code === "FilterInvalidValue")
			throw new LibrusError("Invalid pushDevice ID", response.status, responseJson);
		if (!("Changes" in responseJson))
			throw new LibrusError("No \"Changes\" array in received PushChanges JSON", response.status, responseJson);
		// const pushChanges: number[] = [];
		// if (resultJson.Changes.length > 0) {
		// 	for (const element of resultJson.Changes) {
		// 		if (!pushChanges.includes(element.Id))
		// 			pushChanges.push(element.Id);
		// 	}
		// }
		return responseJson;
	}

	/**
	 * Effectively marks changes as "read" so they don't show up in future `getPushChanges()` calls.
	 * This sends a DELETE request for all IDs in given array, more than one if more than 30 IDs are passed in.
	 * @param lastPushChanges String array of IDs to be deleted.
	 * @async
	 */
	async deletePushChanges(lastPushChanges: string[]) {
		if (!lastPushChanges.length)
			return;
		while (lastPushChanges.length) {
			const delChanges = lastPushChanges.splice(0, 30).join(",");
			await this.customLibrusRequest(`https://api.librus.pl/3.0/PushChanges/${delChanges}?pushDevice=${this.pushDevice}`, {
				fetchOptions: {
					method: "DELETE"
				}
			});
		}
		return;
	}
}