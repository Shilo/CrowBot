var debug = false;

module.exports = {
	project: {
		name: 					'CrowBot - Crowfall IRC bot created by Shilo',
		version: 				'2.0',
		sourceRepo: 			'https://github.com/Shilo/CrowBot',
	},
	
	bot: {
		admins: 				['Shilo'],
		server: 				'irc.quakenet.org',
		channels: 				!debug ? ['#CrowFallGame'] : ['#Crowbot'],
        nick: 					'CrowBot',
        userName: 				'CrowBot',
        realName: 				'Crowfall bot by Shilo',
        password: 				'',
        greeting:				"Hello %who. I am your friendly neighborhood CrowBot. Type '!help' for info on how I can assist you. (This message will only appear once.)",
        port: 					6667,
        localAddress:		 	null,
        autoAuth:				true,
        debug: 					false,
        showErrors: 			false,
        autoRejoin: 			true,
        autoConnect: 			true,
        retryCount: 			null,
        retryDelay: 			2000,
        secure: 				false,
        selfSigned:	 			false,
        certExpired: 			false,
        floodProtection: 		false,
        floodProtectionDelay: 	1000,
        sasl: 					false,
        stripColors: 			false,
        channelPrefixes: 		'&#',
        messageSplit: 			512,
        encoding: 				false,
        webirc: {
          pass: '',
          ip: 	'',
          user: ''
        }
	},
	
	commander: {
		commandPrefix: 			'!',
		argumentSeparator:		' ',
		yellArgument:			'yell'
	},
	
	kickstarter: {
		title:					'crowfall-throne-war-pc-mmo',
		url:					'https://www.kickstarter.com/projects/crowfall/crowfall-throne-war-pc-mmo'
	},
	
	crowfallFunding: {
		json:					'https://api.epicdata.io/api/ecommerce/total',
		url:					'http://crowfall.com/#/payment',
		statsJSON:				'http://crowfall.caravus.org/site/bot',
		statsURL:				'http://crowfall.caravus.org/',
		trackingGoalsInterval:	600000.0
	}
};