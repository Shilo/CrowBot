var child_process = require('child_process');
var irc = require("irc");

var debug = false;
var didJoin = false;

var config = {
	channels: ["#CrowfallGame"+(debug?"Test":"")],
	server: "irc.quakenet.org",
	botName: "CrowBotPsych",
	botRealName: "Bot by Shilo",
	originalBotName: "CrowBot",
};

function relaunch() {
	bot.say(config.channels[0], "Relaunching "+config.originalBotName+"...");
	child_process.exec('/Users/Shilo/Programming_Files/Shilocity_Productions/Crowfall/IRC/CrowBot-repo/CrowBot.command',
	  function (error, stdout, stderr) {
		if (error !== null) {
		  	console.log('exec error: ' + error);
		} else {
			console.log("Relaunched "+config.originalBotName+"!");
		}
	});
}

var bot = new irc.Client(config.server, config.botName, {
	channels: config.channels,
	nick: config.botName,
	userName: config.botName,
    realName: config.botRealName,
    showErrors: true,
    autoRejoin: true,
    autoConnect: false,
    floodProtection: true,
    debug: false,
});

bot.addListener("join", function(channel, who) {
	if (!didJoin) {
		didJoin = true;
		console.log("Joined channel \""+config.channels[0]+"\" as nickname \""+who+"\".");
	}
});

bot.addListener("quit", function (nick, reason, channels, message) {
	if (nick == config.originalBotName) {
		relaunch();
	}
});

bot.addListener('error', function(message) {
    console.log('ERROR: '+message);
});

console.log("Connecting to \""+config.server+" "+config.channels[0]+"\"...");
bot.connect();