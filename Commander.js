var Util = require('./Util.js');
var Config = require('./Config.js');
var Kickstarter = require('./Kickstarter.js');
var CrowfallFunding = require('./CrowfallFunding.js');
var Funding = require('./Funding.js');

var Commander = module.exports = {
	bot: null,
	setBot: function(bot) {
		this.bot = bot;
		CrowfallFunding.bot = bot;
	},
	
	execute: function(text, from, callback, isPM) {
		if (Util.stringStartsWith(text, Config.commander.commandPrefix)) {
			text = text.substr(Config.commander.commandPrefix.length);
		} else if (!isPM || text.trim().length == 0) {
			return;
		}
		
		var components = text.split(Config.commander.argumentSeparator);
		var command = components.shift().toLowerCase();
		var commandFunction = Commands[command];
		if (!Util.isFunction(commandFunction) && Util.arrayContains(Config.bot.admins, from)) {
			commandFunction = CommandsAdmin[command];
		}
		var funcCallback = Util.isFunction(callback) ? callback : this.defaultCallback;
		var yell = this.shouldYell(components);
		
		if (Util.isFunction(commandFunction)) {
			commandFunction(funcCallback, from, yell, components);
		} else {
			funcCallback('Command \'' + command + '\' not found!', from, yell);
		}
	},
	
	defaultCallback: function(message, from, yell) {
		Commander.bot.say(message, from, yell);
	},
	
	shouldYell: function(components) {
		return (Util.isArrayWithLength(components) && components[components.length-1].toLowerCase() == Config.commander.yellArgument);
	},
	
	commandList: function() {
		var commandPrefix = Config.commander.commandPrefix;
		return Object.keys(Commands).map(function(element) { 
  			return commandPrefix + element; 
		}).join(', ');
	},
	
	commandListAdmin: function() {
		var commandPrefix = Config.commander.commandPrefix;
		return Object.keys(CommandsAdmin).map(function(element) { 
  			return commandPrefix + element; 
		}).join(', ');
	},
	
	randomCommand: function() {
		var commandKeys = Object.keys(Commands);
		return commandKeys[Math.floor(Math.random()*commandKeys.length)];
	},
	
	sayNoAuthority: function(from, yell) {
		this.bot.say("You have no authority over me!", from, yell);
	},
	
	onRegistered: function() {
		CrowfallFunding.init();
	}
};

var Commands = {
	help: function(callback, from, yell, components) {
		if (Util.isArrayWithLength(components)) {
			var helpArgument = HelpArguments[components[0]];
			if (!Util.isFunction(helpArgument) && Util.arrayContains(Config.bot.admins, from)) {
				helpArgument = HelpArgumentsAdmin[components[0]];
			}
			if (Util.isFunction(helpArgument)) {
				callback(helpArgument(from), from, yell);
				return;
			}
		}
		
		var commandPrefix = Config.commander.commandPrefix;
		var help = Config.project.name + ' ( version: ' + Config.project.version;
		if (typeof Config.project.sourceRepo === 'string') {
			help += ', source: ' + Config.project.sourceRepo;
		}
		help += ' )';
		help += '\nCommand list: ' + Commander.commandList();
		if (Util.arrayContains(Config.bot.admins, from)) {
			help += '\nAdministrator command list: ' + Commander.commandListAdmin();
		}
		help += '\nType \''+commandPrefix+'help {SPECIFIC COMMAND}\' for information on a specific command. Example: \''+commandPrefix+'h '+Commander.randomCommand()+'\'.';
		callback(help, from, false);
	},
	
	h: function() {
		Commands.help.apply(this, arguments);
	},
	
	kickstarter: function(callback, from, yell, components) {
		Kickstarter.requestProjectSummary(function(info) {
			if (Util.isArrayWithLength(components)) {
				var infoLines = info.split('\n');
				var type = components[0].toLowerCase();
				switch (type) {
					case 'title':
						info = infoLines[0];
						break;
					case 'backers':
						info = infoLines[1];
						break;
					case 'pledged':
						info = infoLines[2];
						break;
					case 'time':
					case 'state':
						info = infoLines[3];
						break;
					case 'url':
						info = infoLines[4];
						break;
				}
			}
			callback(info, from, yell);
		});
	},
	
	ks: function() {
		Commands.kickstarter.apply(this, arguments);
	},
	
	cffunding: function(callback, from, yell, components) {
		CrowfallFunding.requestSummary(function(info) {
			if (Util.isArrayWithLength(components)) {
				var infoLines = info.split('\n');
				var type = components[0].toLowerCase();
				switch (type) {
					case 'title':
						info = infoLines[0];
						break;
					case 'backers':
						info = infoLines[1];
						break;
					case 'pledged':
						info = infoLines[2];
						break;
					case 'delay':
						info = infoLines[3];
						break;
					case 'url':
						info = infoLines[4];
						break;
					case 'stat':
						CrowfallFunding.requestStatData(function(info) {
							var time = Util.isArrayAtLeastLength(components, 2) ? components[1].toLowerCase() : '';
							var infoLines = info.split('\n');
							switch (time) {
								case 'hour':
									info = infoLines[0];
									break;
								case 'day':
									info = infoLines[1];
									break;
								case 'week':
									info = infoLines[2];
									break;
								case 'month':
									info = infoLines[3];
									break;
							}
							info += (Util.isMultilineString(info)?'\n':' - ') + Config.crowfallFunding.statsURL;
							callback(info, from, yell);
						});
						return;
				}
			}
			callback(info, from, yell);
		});
	},
	
	cff: function() {
		Commands.cffunding.apply(this, arguments);
	},
	
	funding: function(callback, from, yell, components) {
		Funding.requestSummary(function(info) {
			if (Util.isArrayWithLength(components)) {
				var infoLines = info.split('\n');
				var type = components[0].toLowerCase();
				switch (type) {
					case 'total':
						info = infoLines[infoLines.length-1];
						break;
				}
			}
			callback(info, from, yell);
		});
	},
	
	f: function(callback, from, yell, components) {
		Commands.funding.apply(this, arguments);
	},
	
	goal: function(callback, from, yell, components) {
		var type = (Util.isArrayWithLength(components) ? components[0].toLowerCase():null);
		if (type == 'track') {
			if (components.length>1 && Util.arrayContains(Config.bot.admins, from)) {
				var shouldTrack = components[1].toLowerCase();
				if (shouldTrack == 'on' || shouldTrack == 'true' || shouldTrack == '1') {
					CrowfallFunding.trackGoals(true, from, yell);
					return;
				} else if (shouldTrack == 'off' || shouldTrack == 'false' || shouldTrack == '0') {
					CrowfallFunding.trackGoals(false, from, yell);
					return;
				}
			}
			var info = "Tracking goals: ["+(CrowfallFunding.isTrackingGoals()?"on":"off")+"]";
			callback(info, from, yell);
			return;
		}
		
		CrowfallFunding.requestGoals(components, function(info) {
			callback(info, from, yell);
		});
	},
	
	g: function(callback, from, yell, components) {
		Commands.goal.apply(this, arguments);
	}
};

var CommandsAdmin = {
	quit: function(callback, from, yell, components) {
		if (Util.arrayContains(Config.bot.admins, from)) {
			Commander.bot.action(components.join(' '));
		} else {
			Commander.sayNoAuthority(from, yell);
		}
	},
	
	q: function() {
		CommandsAdmin.quit.apply(this, arguments);
	},
	
	yell: function(callback, from, yell, components) {
		if (Util.arrayContains(Config.bot.admins, from)) {
			Commander.bot.say(components.join(' '));
		} else {
			Commander.sayNoAuthority(from, yell);
		}
	},
	
	y: function() {
		return CommandsAdmin.yell.apply(this, arguments);
	},
	
	msg: function(callback, from, yell, components) {
		if (Util.arrayContains(Config.bot.admins, from)) {
			if (Util.isArrayWithLength(components)) {
				var to = components.shift();
				Commander.bot.say(components.join(' '), to);
			}
		} else {
			Commander.sayNoAuthority(from, yell);
		}
	},
	
	pm: function() {
		return CommandsAdmin.msg.apply(this, arguments);
	},
	
	action: function(callback, from, yell, components) {
		if (Util.arrayContains(Config.bot.admins, from)) {
			Commander.bot.action(components.join(' '));
		} else {
			Commander.sayNoAuthority(from, yell);
		}
	},
	
	a: function() {
		return CommandsAdmin.action.apply(this, arguments);
	},
};

var HelpArguments = {
	help: function() {
		var info = Config.commander.commandPrefix+'help, '+Config.commander.commandPrefix+'h [{SPECIFIC COMMAND}] ['+Config.commander.yellArgument+'] - ';
		info += 'Information about bot or specific command.';
		return info;
	},
	
	h: function() {
		return HelpArguments.help.apply(this, arguments);
	},
	
	kickstarter: function() {
		var info = Config.commander.commandPrefix+'kickstarter, '+Config.commander.commandPrefix+'ks [title, backers, pledged, time/state, url] ['+Config.commander.yellArgument+'] - ';
		info += 'Data of Crowfall Kickstarter.';
		return info;
	},
	
	ks: function() {
		return HelpArguments.kickstarter.apply(this, arguments);
	},
	
	cffunding: function() {
		var commandPrefix = Config.commander.commandPrefix;
		var info = commandPrefix+'cfFunding, '+commandPrefix+'cff [title, backers, pledged, delay, url] ['+Config.commander.yellArgument+'] - ';
		info += 'Data of Crowfall.com official funding.\n';
		info += commandPrefix+'cfFunding stat, '+commandPrefix+'cff stat [hour, day, week, month] ['+Config.commander.yellArgument+'] - '
		info += 'Detailed line chart of Crowfall.com official funding. (Created by Caravus.)';
		return info;
	},
	
	cff: function() {
		return HelpArguments.cffunding.apply(this, arguments);
	},
	
	funding: function() {
		var info = Config.commander.commandPrefix+'funding, '+Config.commander.commandPrefix+'f [total] ['+Config.commander.yellArgument+'] - ';
		info += 'Data of Crowfall Kickstarter and Crowfall.com official funding.';
		return info;
	},
	
	f: function() {
		return HelpArguments.funding.apply(this, arguments);
	},
	
	goal: function(from) {
		var commandPrefix = Config.commander.commandPrefix;
		info = commandPrefix+'goal, '+commandPrefix+'g [next, current, unlocked] ['+Config.commander.yellArgument+'] - ';
		info += 'Stretch goal progress.\n';
		var args = Util.arrayContains(Config.bot.admins, from) ? '[on, off, true, false] ' : '';
		info += commandPrefix+'goal track, '+commandPrefix+'g track ' + args + '['+Config.commander.yellArgument+'] - '
		info += 'Stretch goal automatic tracking.  When on, bot will only announce progress every ' + (Config.crowfallFunding.trackingGoalsInterval/60000) + ' mins.';
		return info;
	},
	
	g: function() {
		return HelpArguments.goal.apply(this, arguments);
	}
};

var HelpArgumentsAdmin = {
	quit: function() {
		var info = Config.commander.commandPrefix+'quit, '+Config.commander.commandPrefix+'q - ';
		info += 'Force quit and exit the CrowBot server application.';
		return info;
	},
	
	q: function() {
		return HelpArgumentsAdmin.quit.apply(this, arguments);
	},
	
	yell: function() {
		var info = Config.commander.commandPrefix+'yell, '+Config.commander.commandPrefix+'y {MESSAGE} - ';
		info += 'Remotely send a message to channel(s).';
		return info;
	},
	
	y: function() {
		return HelpArgumentsAdmin.yell.apply(this, arguments);
	},
	
	msg: function() {
		var info = Config.commander.commandPrefix+'msg, '+Config.commander.commandPrefix+'pm {USER} {MESSAGE} - ';
		info += 'Remotely send a private message to user.';
		return info;
	},
	
	pm: function() {
		return HelpArgumentsAdmin.msg.apply(this, arguments);
	},
	
	action: function() {
		var info = Config.commander.commandPrefix+'action, '+Config.commander.commandPrefix+'a {ACTION} - ';
		info += 'Remotely send an action to channel(s).';
		return info;
	},
	
	a: function() {
		return HelpArgumentsAdmin.action.apply(this, arguments);
	},
};