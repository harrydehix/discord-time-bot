require("dotenv").config();
const {
    joinVoiceChannel,
    createAudioPlayer,
    NoSubscriberBehavior,
    createAudioResource,
} = require("@discordjs/voice");
const { Client, ActivityType, GatewayIntentBits } = require("discord.js");
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
    client.user.setActivity({
        name: " die Uhr an🕰️",
        type: ActivityType.Watching,
    });

    const guilds = client.guilds.cache;
    guilds.forEach((guild) => {
        /*const mutedRole = guild.roles.cache.find(
            (role) => role.name === "Muted"
        );
        if (!mutedRole) console.warn("There is no muted role on this server!");*/

        const voiceChannels = guild.channels.cache.filter(
            (channel) =>
                channel.isVoiceBased() &&
                channel.name === process.env.TARGET_CHANNEL_NAME
        );
        const channel = voiceChannels.first();
        if (!channel) {
            console.error(`Didn't find any channel on server '${guild.name}'!`);
            return;
        }

        every(1, "hour")
            .do((time) => {
                console.log(
                    `Connecting to voice channel: '${guild.name}#${channel.name}'`
                );

                // Mute members
                if (process.env.MUTE_MEMBERS === "true") {
                    channel.members.forEach((member) => {
                        if (member.voice) {
                            if (member.id === client.user.id) {
                                member.voice.setMute(false);
                            } else member.voice.setMute(true);
                        }
                    });
                }

                const connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                });

                const audioPlayer = createAudioPlayer({
                    behaviors: {
                        noSubscriber: NoSubscriberBehavior.Pause,
                    },
                });

                connection.subscribe(audioPlayer);

                audioPlayer.on("error", (err) => {
                    console.error(err);
                });

                const resourcePath = path.resolve(
                    __dirname + `/../audios/clock-${time.hour}.mp3`
                );

                const buffer = fs.readFileSync(resourcePath);
                const resource = createAudioResource(resourcePath);
                const duration = getMp3Duration(buffer);

                audioPlayer.play(resource);
                console.log(
                    `Playing audio (${resourcePath}) for hour ${
                        time.hour
                    } (state: ${
                        audioPlayer.checkPlayable()
                            ? "playable"
                            : "not playable"
                    })`
                );

                setTimeout(async () => {
                    audioPlayer.stop();
                    connection.destroy();
                    // Unmute members
                    if (process.env.MUTE_MEMBERS === "true") {
                        const fetchedChannel = await channel.fetch(true);
                        fetchedChannel.members.forEach((member) => {
                            if (member.voice) {
                                member.voice.setMute(false);
                            }
                        });
                    }
                }, duration + 1000);
            })
            .start();
    });
});

client.login(process.env.DISCORD_BOT_TOKEN);
