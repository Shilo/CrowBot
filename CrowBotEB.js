// CrowBotEB focuses entirely on early bird checking to provide better performance.
// The early bird check interval is set at 1000 milliseconds, you may change it via config.monitorLimitedPledgesInterval property.
// If you prefer CrowBot to perform the early bird checking instead, you may enable it with the 'CrowBot.js' config.monitorLimitedPledges property.
// See README.md for installation instructions.

var irc = require("irc");
var request = require('request');
var numeral = require('numeral');
var cheerio = require('cheerio');
var storage = require('node-persist');

var debug = false;

var config = {
	channels: ["#CrowfallGame"+(debug?"Test":"")],
	server: "irc.quakenet.org",
	botName: "CrowBotEB",
	botRealName: "CrowBotEB by Shilo",
	kickstarterTitle: "crowfall-throne-war-pc-mmo",
	monitorLimitedPledges: true,
	monitorLimitedPledgesInterval: 1000.0,
	trackingGoalsInterval: 30000.0,
	showManagePledgeLink: true,
	assignedBotName: null,
	disableSubscriptions: false,
	validBotName: function() {
		return (config.assignedBotName ? config.assignedBotName : config.botName);
	}
};

function botSay(target, message) {
	bot.say(target, message);
	console.log(target+": "+message);
}

var kickstarter = {
	monitorLimitedPledgesTimeoutID: null,
	maxOpenSlotsToLog: 100,
	
	monitorLimitedPledges: function() {
		if (config.monitorLimitedPledges) {
			kickstarter.checkLimitedPledges();
		}
	},
	
	isLimitedPledge: function(index) {
		return (index == 1 ||
				index == 2 ||
				index == 3 ||
				index == 8 ||
				index == 10 ||
				index == 12 ||
				index == 16 ||
				index == 17);
		/*
		return (index == 8 ||
				index == 10 ||
				index == 12 ||
				index == 16 ||
				index == 17);
		*/
	},
	
	maxBackersForPledge: function(index) {
		switch (index) {
			case 1:
				return 2999;
				break;
			case 2:
				return 4000;
				break;
			case 3:
				return 3000;
				break;
			case 8:
				return 600;
				break;
			case 10:
				return 600;
				break;
			case 12:
				return 300;
				break;
			case 16:
				return 30;
				break;
			case 17:
				return 20;
				break;
			default:
				return 0;
		}
	},
	
	checkLimitedPledges: function() {
		function addS(n) {
    		return (Math.abs(n)==1? '':'s');
  		}
  		
  		
		request('https://www.kickstarter.com/projects/crowfall/crowfall-throne-war-pc-mmo', function (error, response, body) {
		  if (!error && response.statusCode == 200) {
		  	var maxOpenSlotsToLog = kickstarter.maxOpenSlotsToLog;
		  	var disableSubscriptions = config.disableSubscriptions;
		  	var showManagePledgeLink = config.showManagePledgeLink;
		  	var channel = config.channels[0];
			var $ = cheerio.load(body, {normalizeWhitespace: true});
			var rewardsDivs = $('.NS_projects__content .NS-projects-reward').each(function( index ) {
				if (kickstarter.isLimitedPledge(index)) {
					var title = $(this).find('.desc p:first-child').text().split(':')[0];
					var backers = parseInt($(this).find('.num-backers').text().split(' ')[1].replace(',', ''));
					var lastBackers = storage.getItem(title);
  					storage.setItem(title, backers);
  					if (backers != lastBackers) {
  						var maxBackers = kickstarter.maxBackersForPledge(index);
  						var openSlots = maxBackers-backers;
  						if (openSlots <= maxOpenSlotsToLog) {
  							var openSlotChange = lastBackers-backers;
  							var msg = title + ': ' + openSlots + ' slot'+addS(openSlots)+' open!';
							msg += ' ('+(openSlotChange>0?'+':'')+openSlotChange+' slot'+addS(openSlotChange)+')';
							if (!disableSubscriptions) {
								var subscribers = storage.getItem('subscribers_'+index);
								if (typeof subscribers === 'object' && subscribers.length > 0) {
									msg += ' - Subscribers: '+subscribers.join(', ');
								}
							}
							if (showManagePledgeLink && openSlots > 0) {
								msg += '\nhttps://www.kickstarter.com/projects/crowfall/crowfall-throne-war-pc-mmo/pledge/edit?ref=manage_pledge';
							}
  							botSay(channel, msg);
  						}
  					}
  				}
			});
		  }
		  if (kickstarter.monitorLimitedPledgesTimeoutID)
				clearTimeout(kickstarter.monitorLimitedPledgesTimeoutID);
		  var monitorLimitedPledgesTimeoutID = setTimeout(kickstarter.checkLimitedPledges, config.monitorLimitedPledgesInterval);
		});
	}
};

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
	if (!config.assignedBotName) {
		storage.initSync();
		config.assignedBotName = who
		console.log("Joined channel \""+config.channels[0]+"\" as nickname \""+who+"\".");
		kickstarter.monitorLimitedPledges();
	}
});

bot.addListener('error', function(message) {
    console.log('ERROR: '+message);
});

console.log("Connecting to \""+config.server+" "+config.channels[0]+"\"...");
bot.connect();