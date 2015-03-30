var IRC = require('irc');
var Storage = require('node-persist');
var Config = require('./Config.js');
var Commander = require('./Commander.js');

var Bot = {
	client: null,
	
	init: function() {
		Storage.initSync();
		Commander.setBot(this);
		
		console.log('Connecting to \''+Config.bot.server+' '+Config.bot.channels+'\'...');
		this.client = new IRC.Client(Config.bot.server, Config.bot.nick, Config.bot);
		this.client.addListener('registered', this.onRegistered);
		this.client.addListener('message', this.onMessage);
		this.client.addListener('join', this.onJoin);
		this.client.addListener('part', this.onPart);
		this.client.addListener('quit', this.onQuit);
		this.client.addListener('kick', this.onKick);
		this.client.addListener('kill', this.onKill);
		this.client.addListener('error', this.onError);
	},
	
	connect: function() {
		this.client.connect();
	},
	
	authorize: function() {
		this.client.send('AUTH', Config.bot.userName, Config.bot.password);
	},
	
	say: function(message, from, yell) {
		var to = (!yell && typeof from === 'string' ? from : Config.bot.channels);
		if (typeof to === 'object') {
			for (i in to) {
				this.sayTo(message, to[i]);
			}
		} else {
			this.sayTo(message, to);
		}
	},
	
	sayTo: function(message, to) {
		this.client.say(to, message);
		console.log(to+': '+message);
	},
	
	action: function(message, from, yell) {
		var to = (!yell && typeof from === 'string' ? from : Config.bot.channels);
		if (typeof to === 'object') {
			for (i in to) {
				this.actionTo(message, to[i]);
			}
		} else {
			this.actionTo(message, to);
		}
	},
	
	actionTo: function(message, to) {
		this.client.action(to, message);
		console.log(to+': *'+message+'*');
	},
	
	greetedList: function() {
		var greeted = Storage.getItem('greeted');
		if (typeof greeted !== 'object') {
			greeted = [];
		}
		return greeted;
	},

	saveGreetedList: function(greeted) {
		Storage.setItem('greeted', greeted);
	},

	pmGreeting: function(who) {
		var greeting = Config.bot.greeting;
		if (typeof greeting !== 'string' || greeting.length < 1) return;

		var greeted = Bot.greetedList();
		if (Util.arrayContains(greeted, who)) {
			return;
		}
		greeted.push(who);
		Bot.saveGreetedList(greeted);

		greeting = greeting.replace('%who', who);
		Bot.say(greeting, who);
	},
	
	onRegistered: function(message) {
		Config.bot.nick = message.args[0];
		Commander.onRegistered();
		console.log('Connected as nick \''+Config.bot.nick+'\'.');
    	if (Config.bot.autoAuth) {
    		Bot.authorize();
    	}
	},
	
	onMessage: function(from, to, message) {
		Commander.execute(message, from, undefined, (to == Config.bot.nick));
	},
	
	onJoin: function(channel, nick, message) {
    	if (nick == Config.bot.nick) {
    		console.log('Joined channel \''+channel+'\'.');
    	} else {
    		Bot.pmGreeting(nick);
    	}
	},
	
	onPart: function(channel, nick, reason, message) {
    	if (nick == Config.bot.nick) {
    		console.log('Left channel \''+channel+'\' (Reason: '+reason+').');
    	}
	},
	
	onQuit: function(nick, reason, channels, message) {
    	if (nick == Config.bot.nick) {
    		console.log('Quit channels \''+channels+'\' (Reason: '+reason+').');
    	}
	},
	
	onKick: function(channel, nick, by, reason, message) {
		console.log('this.nick:'+Config.bot.nick+' nick:'+nick);
    	if (nick == Config.bot.nick) {
    		console.log('Kicked from channel \''+channel+'\' by \''+by+'\' (Reason: '+reason+').');
    	}
	},
	
	onKill: function(nick, reason, channels, message) {
    	if (nick == Config.bot.nick) {
    		console.log('Killed from channels \''+channels+'\'.');
    	}
	},
	
	onError: function(from, message) {
    	console.log('[ERROR] ' + from + ': ' + JSON.stringify(message));
	}
};

Bot.init();