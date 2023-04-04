import { ChannelType, EmbedBuilder, Snowflake, TextBasedChannel } from "discord.js";
import config from "./config.json" assert { type: "json" };
import { client as discordClient, debugChannel } from "./index.js";
import LibrusClient from "./lib/librus-api/index.js";
import * as LibrusApiTypes from "./lib/librus-api/types/api-types.js";
import cron from "node-cron";

interface IRoleRegex {
	roleId: Snowflake;
	roleRegex: RegExp;
	boldRegex: RegExp;
}

interface IChannels {
	channel: TextBasedChannel;
	knownNoticesMap: Map<string, Snowflake>;
	rolesRegexArr: IRoleRegex[];
	numberRolesMap: Map<number, Snowflake>;
}

const noticeListenerChannels: IChannels[] = [];
let librusClient: LibrusClient;

function isPlanChangeNotice(title: string): boolean {
	const titleLower = title.toLowerCase();
	const searchInterests: string[] = ["zmiany w planie", "poniedziałek", "wtorek", "środa", "czwartek", "piątek"];
	for (const searchString of searchInterests) {
		if (titleLower.search(searchString) !== -1) {
			return true;
		}
	}
	return false;
}


async function handleSchoolNotice(update: LibrusApiTypes.IChange) {
	// Handle blocked SchoolNotices
	let changeType: string;
	switch (update.Type) {
		case "Add": {
			changeType = "Nowe Ogłoszenie";
			break;
		}
		case "Edit": {
			changeType = "Ogłoszenie (Zmienione)";
			break;
		}
		case "Delete": {
			console.error(`${update.Resource.Id} - Is deleted. Skipping.`.yellow);
			// await debugChannel.send(`${update.Resource.Id} - Is deleted. Skipping.`);
			return;
		}
		default: {
			console.error("Unhandled update.Type! Skipping.".bgRed.white);
			return;
		}
	}
	// Get notice, author
	let schoolNotice: LibrusApiTypes.ISchoolNotice;
	let schoolNoticeAuthor: LibrusApiTypes.IUser;
	try {
		schoolNotice = await librusClient.schoolNotices.fetch(update.Resource.Id);
		schoolNoticeAuthor = await librusClient.users.fetch(schoolNotice.AddedBy.Id);
	}
	catch (error) {
		console.error(error);
		debugChannel.send(`${error}`);
		return;
	}
	console.log(schoolNotice); // print for debugging
	console.log(schoolNoticeAuthor);
	// Format appropriately per-channel and send
	for (const listener of noticeListenerChannels) {
		let embedDesc = schoolNotice.Content;
		let contentText = `**${changeType}**\n`;
		if (isPlanChangeNotice(schoolNotice.Subject) && listener.rolesRegexArr.length > 0) {
			// Prepend role mentions
			for (const role of listener.rolesRegexArr) {
				if (role.roleRegex.test(embedDesc))
					contentText += `<@&${role.roleId}> `;
				embedDesc = embedDesc.replaceAll(role.roleRegex, `<@&${role.roleId}> $&`);
			}
			// Bold the text
			for (const role of listener.rolesRegexArr) {
				embedDesc = embedDesc.replaceAll(role.boldRegex, "**$&**");
			}
		}
		// Build message embed
		const embed = new EmbedBuilder()
			.setColor("#D3A5FF")
			.setAuthor({
				name: `${schoolNoticeAuthor.FirstName} ${schoolNoticeAuthor.LastName}`
			})
			.setTitle(`**__${schoolNotice.Subject}__**`)
			.setDescription(embedDesc.substring(0, 4096)) // TODO podział na fieldy z pustymi tytułami, są do 1024 znaków :)
			.setFooter({ text: `Dodano: ${schoolNotice.CreationDate}` });
		if (listener.knownNoticesMap.has(schoolNotice.Id)) {
			// Edit existing message if exists
			const messageId = listener.knownNoticesMap.get(schoolNotice.Id);
			if (messageId == null)
				throw new Error("knownNoticesMap value (message id) is null");
			const message = await listener.channel.messages.fetch(messageId);
			await message.edit({
				content: contentText,
				embeds: [embed.setFooter({ text: `Dodano: ${schoolNotice.CreationDate} | Ostatnia zmiana: ${update.AddDate}` })]
			});
			await listener.channel.send({
				reply: { messageReference: messageId, failIfNotExists: false },
				content: "Zmieniono ogłoszenie ^"
			});
		}
		else {
			// Simply send otherwise
			const message = await listener.channel.send({
				content: contentText,
				embeds: [embed]
			});
			listener.knownNoticesMap.set(schoolNotice.Id, message.id);
			// Crosspost if in News c`hannel
			if (listener.channel.type == ChannelType.GuildAnnouncement) {
				message.crosspost()
					.catch(error => {
						console.error("Error while crossposting:", error);
						debugChannel.send(`Error while crossposting: ${error}`);
					});
			}
		}
	}
	console.log(`${schoolNotice.Id}  --- Sent!`.green);
}

async function handleTeacherFreeDay(update: LibrusApiTypes.IChange) {
	let messageContent = "";
	switch (update.Type) {
		case "Add": {
			messageContent = "Dodano nieobecność nauczyciela";
			break;
		}
		case "Edit": {
			messageContent = "Zmieniono nieobecność nauczyciela";
			await debugChannel.send(`${messageContent} ${update.Resource.Id}`);
			break;
		}
		case "Delete": {
			messageContent = "Usunięto nieobecność nauczyciela";
			await debugChannel.send(`${messageContent} ${update.Resource.Id}`);
			break;
		}
		default: {
			console.error("Unhandled update.Type! Skipping.".bgRed.white);
		}
	}
	let teacherFreeDay: LibrusApiTypes.ITeacherFreeDay;
	let teacher: LibrusApiTypes.IUser;
	try {
		teacherFreeDay = await librusClient.calendars.teacherFreeDays.fetch(parseInt(update.Resource.Id));
		console.log(teacherFreeDay);
		teacher = await librusClient.users.fetch(teacherFreeDay.Teacher.Id);
		console.log(teacher);
	}
	catch (error) {
		console.error(error);
		debugChannel.send(`${error}`);
		return;
	}
	const embedTitle = `${teacher.FirstName} ${teacher.LastName}`;
	let embedDesc = "";
	if (update.extraData != null && update.extraData.length > 0)
		embedDesc += "\n" + update.extraData;
	if (teacherFreeDay.Name?.length > 0)
		embedDesc += "\n" + teacherFreeDay.Name;
	let timestampFrom = teacherFreeDay.DateFrom;
	let timestampTo = teacherFreeDay.DateTo;
	if ("TimeFrom" in teacherFreeDay)
		timestampFrom += " " + teacherFreeDay.TimeFrom;
	if ("TimeTo" in teacherFreeDay)
		timestampTo += " " + teacherFreeDay.TimeTo;
	const embed = new EmbedBuilder()
		.setColor("#E56390")
		.setTitle(embedTitle)
		.setDescription(embedDesc.length > 0 ? embedDesc : null) // Is this really necessary?
		.setFields([
			{ name: "Od:", value: timestampFrom },
			{ name: "Do:", value: timestampTo }
		])
		.setFooter({ text: `Dodano: ${teacherFreeDay.AddDate}` });
	// Send
	for (const listener of noticeListenerChannels) {
		const message = await listener.channel.send({ content: `**${messageContent}**`, embeds: [embed] });
		if (listener.channel.type == ChannelType.GuildAnnouncement) {
			message.crosspost()
				.catch(error => {
					console.error("Error while crossposting:", error);
					debugChannel.send(`Error while crossposting: ${error}`);
				});
		}
	}
	console.log(`${update.Resource.Url}  --- Sent!`.green);
}

async function fetchNewSchoolNotices(): Promise<void> {
	// TODO: Timer handling
	const failDelayTimeMs = 2 * 60 * 1000;
	// Massive try-catch: If any of code fails within this block we WANT to fail,
	// otherwise undefined behavior might occur that is too hard to handle because
	// of the unknown that is the trash librus app API. Too bad!
	try {
		const pushChanges = await librusClient.getPushChanges();
		const pushChangesToDelete: string[] = [];
		for (const update of pushChanges.Changes) {
			console.log(update);
			// Get the notice if the element is of type 'SchoolNotices'
			switch (update.Resource.Type) {
				case "SchoolNotices": {
					await handleSchoolNotice(update);
					break;
				}
				case "Calendars/TeacherFreeDays": {
					await handleTeacherFreeDay(update);
					break;
				}
				default: {
					console.log(`Skipping ${update.Resource.Url}`.bgMagenta.white);
				}
			}
			pushChangesToDelete.push(update.Id);
			// do the DELETE(s) only once everything else succeeded
		}
		await librusClient.deletePushChanges(pushChangesToDelete);
	}
	catch (error) {
		console.error("Something in checking pushChanges failed:".bgRed.white, error);
		await debugChannel.send(`Something in checking pushChanges failed: ${error}`);
		console.error(`Retrying fetchNewSchoolNotices() in ${failDelayTimeMs / 60000} mins.`.bgRed.white);
		setTimeout(fetchNewSchoolNotices, failDelayTimeMs);
		return;
	}
	console.log("DONE".gray);
	setTimeout(fetchNewSchoolNotices, 7 * 60 * 1000);
}

async function registerTrackedChannels(): Promise<void> {
	const classRoleRegex = /^([1-4])([A-Ia-i])(?:3|4)?$/; // regex for class roles
	for (const channelConfig of config.librusChannels) {
		// Get channel by ID, handle potential errors
		const channel = await discordClient.channels.fetch(channelConfig.channelId);
		if (channel == null) {
			console.error(`${channelConfig.channelId} - channel fetch() returned null!`.white.bgRed);
			await debugChannel.send(`${channelConfig.channelId} - channel fetch() returned null!`);
			continue;
		}
		if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
			console.error(`${channel.id} is not a valid guild text/news channel!`.white.bgRed);
			await debugChannel.send(`${channel.id} is not a valid guild text/news channel!`);
			continue;
		}
		const rolesRegexArr: IRoleRegex[] = [];
		const guildRoles = await (await discordClient.guilds.fetch(channelConfig.guildId)).roles.fetch();
		// Fill roleRegexArr with appropriate role IDs and their respective regexes
		if (channelConfig.tagRoles) {
			for (const [roleId, role] of guildRoles) {
				// Check if a role is a class role (judged from name)
				if (classRoleRegex.test(role.name)) {
					// Create the regex and push to rolesRegexArr
					const regexResult = classRoleRegex.exec(role.name);
					if (regexResult == null)
						throw new Error("RegExp result is null");
					const classYear = regexResult[1];
					const classLetters = regexResult[2].toUpperCase() + regexResult[2].toLowerCase();
					rolesRegexArr.push({
						roleId: roleId,
						roleRegex: new RegExp(`${classYear}[A-Ia-i]*[${classLetters}][A-Ia-i]*`, "g"), // class regex for notices
						boldRegex: new RegExp(`(?<!\\*\\*)(?!${classYear}[A-Ia-i]*[${classLetters}][A-Ia-i]*\\*\\*)${classYear}[A-Ia-i]*[${classLetters}][A-Ia-i]*`, "g") // won't match if preceded or appended with **
					});
					// console.debug(rolesRegexArr);
				}
			}
		}
		// LuckyNumbers roles
		const luckyNumbersMap = new Map<number, Snowflake>();
		const numberRoleRegex = /^Numerek ([0-4]?[0-9])$/;
		for (const [roleId, role] of guildRoles) {
			if (numberRoleRegex.test(role.name)) {
				const regexResult = numberRoleRegex.exec(role.name);
				if (regexResult == null)
					throw new Error("RegExp result is null");
				const number = parseInt(regexResult[1]);
				if (isNaN(number)) {
					console.trace(roleId);
					throw new Error("Role number is NaN??");
				}
				luckyNumbersMap.set(number, roleId);
			}
		}
		// Push complete channel data to global array
		noticeListenerChannels.push({
			channel: channel,
			rolesRegexArr: rolesRegexArr,
			knownNoticesMap: new Map<string, Snowflake>(),
			numberRolesMap: luckyNumbersMap
		});
	}
	// console.debug(util.inspect(noticeListenerChannels, false, null, true));
}

async function luckyNumbersCron() {
	try {
		const luckyNumbersResponse = await librusClient.luckyNumbers.fetch();
		const embed = new EmbedBuilder()
			.setColor("#36DDE3")
			.setTitle(`**__Dzisiejszy szczęśliwy numerek to ${luckyNumbersResponse.LuckyNumber}!__**`)
			.setFooter({
				text: `Dnia: ${luckyNumbersResponse.LuckyNumberDay}`
			});
		for (const listener of noticeListenerChannels) {
			const roleId = listener.numberRolesMap.get(luckyNumbersResponse.LuckyNumber);
			let tagText = "";
			if (roleId != null) {
				tagText = `<@&${roleId}>`;
			}
			else {
				tagText = `@Numerek ${luckyNumbersResponse.LuckyNumber} (brak roli)`;
			}
			await listener.channel.send({
				content: tagText,
				embeds: [embed]
			});
		}
	}
	catch (error) {
		console.error("Something in checking lucky numbers failed:".bgRed.white, error);
		await debugChannel.send(`Something in checking lucky numbers failed: ${error}`);
	}
}

export default async function initLibrusManager() {
	librusClient = new LibrusClient({ debug: true });
	await librusClient.login(config.librusLogin, config.librusPass);
	// librusClient.pushDevice = await librusClient.newPushDevice();
	librusClient.pushDevice = config.pushDevice;
	await registerTrackedChannels();
	setTimeout(fetchNewSchoolNotices, 2000);
	cron.schedule("30 6 * * 1-5", luckyNumbersCron);
}
