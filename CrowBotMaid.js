var child_process = require('child_process');
var irc = require("irc");

var debug = false;
var didJoin = false;

var config = {
	channels: ["#CrowfallGame"+(debug?"Test":"")],
	server: "irc.quakenet.org",
	botName: "CrowBotMaid",
	botRealName: "Bot by Shilo",
	masterBotNames: ["CrowBot", "CrowBotEB"],
	executablePath: __dirname+'/CrowBot.command'
};

function arrayContains(a, obj) {
    var i = a.length;
    while (i--) {
       if (a[i] === obj) {
           return true;
       }
    }
    return false;
}

function isMasterBotName(name) {
	return arrayContains(config.masterBotNames, name);
}

function relaunch(botName) {
	bot.say(config.channels[0], "Relaunching Master "+botName+"...");
	console.log("Relaunching Master "+botName+"...");
	child_process.exec(config.executablePath,
	  function (error, stdout, stderr) {
		if (error !== null) {
			bot.say(config.channels[0], "Error relaunching Master "+botName+"!");
		  	console.log('exec error: ' + error);
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
	if (isMasterBotName(nick)) {
		relaunch(nick);
	}
});

bot.addListener('error', function(message) {
    console.log('ERROR: '+message);
});

console.log("Connecting to \""+config.server+" "+config.channels[0]+"\"...");
bot.connect();