import Discord, { ActivityType, ChannelType, GatewayIntentBits } from "discord.js";
import initLibrusManager from "./librusManager.js";
import config from "./config.json" assert { type: "json" };

export const client = new Discord.Client({ intents: GatewayIntentBits.GuildMessages });
export let debugChannel: Discord.TextChannel;

// const config: typeof import("../config.json") = JSON.parse(fs.readFileSync(__dirname + "../config.js", "utf-8"));

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
client.on("messageCreate",message=>{
	if(message.author.id===client.user?.id)
		if(message.channel.type===ChannelType.GuildAnnouncement)
			message.crosspost()
			.catch(error=>{
				console.error(error);
			})
})
client.login(config.discordToken);
