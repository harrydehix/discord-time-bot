require("dotenv").config();
const {
    joinVoiceChannel,
    createAudioPlayer,
    NoSubscriberBehavior,
    createAudioResource,
} = require("@discordjs/voice");
const {
    Client,
    ActivityType,
    GatewayIntentBits,
    Guild,
    GuildBasedChannel,
} = require("discord.js");
const { every } = require("@harrydehix/everyjs");
const { DateTime } = require("luxon");
const path = require("path");
const fs = require("fs");
const getMp3Duration = require("get-mp3-duration");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

client.once("ready", () => {
    console.log(
        `Connected to ${client.guilds.cache.size} server(s)! Loggend in as ${client.user.tag}!`
    );

    // 1. Set the bots activity state
    client.user.setActivity({
        name: process.env.ACTIVITY_TEXT,
        type: ActivityType[process.env.ACTIVITY_TYPE],
    });

    const guilds = client.guilds.cache;

    // 2. Loop to all connected servers
    guilds.forEach((guild, index) => {
        console.log(`Handling server '${guild.name}'`);
        // 3. Find the target voice channel
        const voiceChannels = guild.channels.cache.filter(
            (channel) =>
                channel.isVoiceBased() &&
                channel.name === process.env.TARGET_CHANNEL_NAME
        );
        const channel = voiceChannels.first();
        if (!channel) {
            console.error(
                `Didn't find any channel with name '${process.env.TARGET_CHANNEL_NAME}' on server '${guild.name}'!`
            );
            return;
        }

        // 4. Play audio on the voice channel every hour
        playAudioOfCurrentHour(DateTime.now(), guild, channel);
        const task = every(1, "hour").do((time) =>
            playAudioOfCurrentHour(time, guild, channel)
        );
        task.start();
    });
});

client.login(process.env.DISCORD_BOT_TOKEN);

/**
 * Plays the configured audio of the current hour on the passed guild#channel.
 * @param {DateTime} time the current time (luxon date)
 * @param {Guild} guild the target guild
 * @param {GuildBasedChannel} channel the target channel
 */
function playAudioOfCurrentHour(time, guild, channel) {
    // 1. Mute members
    if (process.env.MUTE_MEMBERS === "true") {
        console.log(`${guild.name}#${channel.name}: Muting members`);
        channel.members.forEach((member) => {
            if (member.voice) {
                if (member.id === client.user.id) {
                    member.voice.setMute(false);
                } else member.voice.setMute(true);
            }
        });
    } else {
        console.log(
            `${guild.name}#${channel.name}: Not muting members (is disabled)`
        );
    }

    // 2. Join voice channel
    console.log(`${guild.name}#${channel.name}: Joining voice channel`);
    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
    });

    // 3. Prepare playing audio
    const audioPlayer = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Pause,
        },
    });
    connection.subscribe(audioPlayer);
    audioPlayer.on("error", (err) => {
        console.error(`${guild.name}#${channel.name}: ` + err);
    });

    const resourcePath = path.resolve(
        __dirname + `/../audios/clock-${time.hour}.mp3`
    );

    const buffer = fs.readFileSync(resourcePath);
    const resource = createAudioResource(resourcePath);
    const duration = getMp3Duration(buffer);

    // 4. Play audio
    console.log(
        `${guild.name}#${channel.name}: Playing audio (${resourcePath}) for hour ${time.hour}`
    );
    audioPlayer.play(resource);

    setTimeout(async () => {
        // 5. Disconnect
        audioPlayer.stop();
        connection.destroy();

        // 6. Unmute members
        if (process.env.MUTE_MEMBERS === "true") {
            console.log(`${guild.name}#${channel.name}: Unmuting members`);
            const fetchedChannel = await channel.fetch(true);
            fetchedChannel.members.forEach((member) => {
                if (member.voice) {
                    member.voice.setMute(false);
                }
            });
        }
    }, duration + 1000);
}
