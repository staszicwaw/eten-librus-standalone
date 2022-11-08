import Discord, { ActivityType, GatewayIntentBits } from "discord.js";
import config from "./config.json";
import initLibrusManager from "./lib/librusManager";

export const client = new Discord.Client({ intents: GatewayIntentBits.GuildMessages });
export let debugChannel: Discord.TextChannel;

client.once("ready", async () => {
	if (client.user == null)
		throw new Error("user does not exist on client");
	console.log(`Logged in as ${client.user.tag}`);
	client.user.setStatus("online");
	client.user.setActivity("Librus news", { type: ActivityType.Watching });
	// Store debug channel for future use
	const channel = await client.channels.fetch(config.debugMessagesChannel);
	if (channel != null && channel.type === Discord.ChannelType.GuildText) {
		debugChannel = channel;
	}
	else {
		console.log(channel);
		throw new Error("Channel error");
	}
	console.log("Ready!");
	initLibrusManager();
});

client.login(config.discordToken);
