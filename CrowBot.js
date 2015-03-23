// Note: The source code was quickly thrown together due to time constraints. It is stable but not nearly as readable as it could be.
// See README.md for installation instructions.

var irc = require("irc");
var request = require('request');
var numeral = require('numeral');
var cheerio = require('cheerio');
var storage = require('node-persist');

var debug = false;

var config = {
	password: '',
	channels: ["#CrowfallGame"+(debug?"Test":"")],
	server: "irc.quakenet.org",
	botName: "CrowBot",
	botRealName: "Bot by Shilo",
	kickstarterTitle: "crowfall-throne-war-pc-mmo",
	commandPrefix: "!",
	greetingSay: "Hello fellow Crows. I am your friendly neighborhood CrowBot. Type '!help' for info on how I can assist you.",
	greetingPM: "Hello fellow Crow. I am your friendly neighborhood CrowBot. Type '!help' for info on how I can assist you. (This message will only appear once.)",
	showGreetingSay: false,
	showGreetingPM: true,
	monitorLimitedPledges: true,
	monitorLimitedPledgesInterval: 15000.0,
	trackingGoalsInterval: 30000.0,
	trackingGoalsPoliteInterval: 300000.0,
	trackingGoalsPledgeRange: 1000.0,
	trackingGoalsBackersRange: 10,
	showManagePledgeLink: true,
	assignedBotName: null,
	disableSubscriptions: false,
	validBotName: function() {
		return (config.assignedBotName ? config.assignedBotName : config.botName);
	}
};

function isFunction(x) {
  return Object.prototype.toString.call(x) == '[object Function]';
}

function strStartsWith(str, prefix) {
    return str.indexOf(prefix) === 0;
}

function msToTime(s) {
	function addS(n) {
    	return (n==1? '':'s');
  	}
	var ms = s % 1000;
	s = (s - ms) / 1000;
	var secs = s % 60;
	s = (s - secs) / 60;
	var mins = s % 60;
	s = (s - mins) / 60;
	var hrs = s % 24;
	s = (s - hrs) / 24;
	var days = s;

	return days + ' day' + addS(days) + ', ' + hrs + ' hour' + addS(hrs) + ', ' + mins + ' min' + addS(mins) + ', ' + secs + ' sec' + addS(secs);
}

function arrayRemove(a, obj) {
    var i = a.length;
    while (i--) {
       if (a[i] === obj) {
       		a.splice(i,1);
           return true;
       }
    }
    return false;
}

function arrayContains(a, obj) {
    var i = a.length;
    while (i--) {
       if (a[i] === obj) {
           return true;
       }
    }
    return false;
}

function arrayIndexCaseInsensitive(a, obj) {
	obj = obj.toLowerCase();
    var i = a.length;
    while (i--) {
       if (a[i].toLowerCase() === obj) {
           return i;
       }
    }
    return -1;
}

function botSay(target, message) {
	bot.say(target, message);
	console.log(target+": "+message);
}

var kickstarter = {
	monitorLimitedPledgesTimeoutID: null,
	maxOpenSlotsToLog: 100,
	pledgeStretchGoals: [
		{'title': 'NEW CHARACTERS & FX', 'amount': 1000000},
		{'title': 'MOUNTS & CARAVANS', 'amount': 1300000},
		{'title': 'GOD\'S REACH, ARTIFACTS & RELICS', 'amount': 1400000},
		{'title': 'NONE', 'amount': 9999999}
	],
	
	backerStretchGoals: [
		{'title': 'EXCLUSIVE STATUE FOR EVERYONE', 'amount': 12000},
		{'title': 'FREE MONTH OF VIP FOR EVERYONE', 'amount': 13000},
		{'title': 'PACK ANIMAL FOR EVERYONE', 'amount': 14000},
		{'title': 'BONUS PARCELS', 'amount': 14500},
		{'title': 'VR HEADSET SUPPORT', 'amount': 15000},
		{'title': 'NONE', 'amount': 9999999}
	],
	
	pledgeNames: [
		'SUPPORTER',
		'CONTRIBUTOR - EARLIEST BIRD',
		'CONTRIBUTOR - EARLY BIRD',
		'CONTRIBUTOR - EARLY BIRD 2',
		'CONTRIBUTOR',
		'BACKER',
		'BRONZE PATRON',
		'SILVER PATRON',
		'GOLD PATRON - EARLY BIRD',
		'GOLD PATRON',
		'AMBER PATRON - EARLY BIRD',
		'AMBER PATRON',
		'SAPPHIRE PATRON - EARLY BIRD',
		'SAPPHIRE PATRON',
		'RUBY PATRON',
		'EMERALD PATRON',
		'DIAMOND PATRON',
		'BLOODSTONE PATRON'
	],
	
	currentAndNextGoals: function(amount, goals) {
		var lastGoals = [goals[0], goals[1]];
		for (var i in goals) {
		  	var goal = goals[i];
			if (goal.amount <= amount) {
				lastGoals[0] = goal;	
			} else {
				lastGoals[1] = goal;
				break;
			}
		}
		return lastGoals;
	},
	
	currentOrNextGoal: function(amount, goals) {
		for (var i in goals) {
		  	var goal = goals[i];
			if (goal.amount >= amount) {
				return goal;
			}
		}
		return goals[goals.length-1];
	},
	
	requestData: function(callback) {
		request('https://www.kickstarter.com/projects/search.json?search=&term='+config.kickstarterTitle, function (error, response, body) {
		  if (isFunction(callback)) {
			  if (!error && response.statusCode == 200) {
				var data = JSON.parse(body);
				callback(data);
			  } else {
				callback("Error retrieving Kickstarter data. Try again later.");
			  }
		  }
		});
	},
	
	requestProject: function(callback) {
		this.requestData(function(data) {
			if (isFunction(callback)) {
				if (typeof data === 'object') {
					var project = data.projects[0];
					callback(project);
				} else {
					callback(data);
				}
			}
		});
	},
	
	requestProjectSummary: function(callback) {
		this.requestProject(function(project) {
			if (isFunction(callback)) {
				if (typeof project === 'object') {
					var name = project.name;
					var state = project.state;
					var backers = project.backers_count;
					var pledged = project.pledged;
					var currency_symbol = project.currency_symbol;
					var goal = project.goal;
					var deadline = project.deadline;
					var currentTime = new Date().getTime();
					var timeLeft = msToTime(parseInt(deadline) * 1000 - currentTime);
					
					var info = name + '\n';
					info += 'Backers: ' + numeral(backers).format('0,0') + '\n';
					info += 'Pledged: ' + currency_symbol + numeral(pledged).format('0,0.00') + ' of ' + currency_symbol + numeral(goal).format('0,0.00') + ' (' + numeral(pledged/goal*100).format('0,0.00') + '%)\n';
					info += (state == 'live' ? 'Time left: ' + timeLeft : 'State: ' + state) + '\n';
					info += 'https://www.kickstarter.com/projects/crowfall/crowfall-throne-war-pc-mmo';
					
					callback(info, pledged, backers);
				} else {
					callback(project);
				}
			}
		});
	},
	
	requestGoals: function(callback) {
		this.requestProject(function(project) {
			if (isFunction(callback)) {
				if (typeof project === 'object') {
					var backers = project.backers_count;
					var pledged = project.pledged;
					
					var currentAndNextPledgeGoals = kickstarter.currentAndNextGoals(pledged, kickstarter.pledgeStretchGoals);
					var currentAndNextBackerGoals = kickstarter.currentAndNextGoals(backers, kickstarter.backerStretchGoals);
					
					var info = [
							'Unlocked Pledge Goal: ' + currentAndNextPledgeGoals[0].title + ' - $' + numeral(pledged).format('0,0.00') + ' of $' + numeral(currentAndNextPledgeGoals[0].amount).format('0,0.00') + ' (' + numeral(pledged/currentAndNextPledgeGoals[0].amount*100).format('0,0.00') + '%)',
							'Unlocked Backers Goal: ' + currentAndNextBackerGoals[0].title + ' - ' + numeral(backers).format('0,0') + ' of ' + numeral(currentAndNextBackerGoals[0].amount).format('0,0') + ' (' + numeral(backers/currentAndNextBackerGoals[0].amount*100).format('0,0.00') + '%)',
							'Next Pledge Goal: ' + currentAndNextPledgeGoals[1].title + ' - $' + (numeral(currentAndNextPledgeGoals[1].amount-pledged).format('0,0.00')) + ' left, $' + numeral(pledged).format('0,0.00') + ' of $' + numeral(currentAndNextPledgeGoals[1].amount).format('0,0.00') + ' (' + numeral(pledged/currentAndNextPledgeGoals[1].amount*100).format('0,0.00') + '%)',
							'Next Backers Goal: ' + currentAndNextBackerGoals[1].title + ' - ' + (numeral(currentAndNextBackerGoals[1].amount-backers).format('0,0')) + ' left, ' + numeral(backers).format('0,0') + ' of ' + numeral(currentAndNextBackerGoals[1].amount).format('0,0') + ' (' + numeral(backers/currentAndNextBackerGoals[1].amount*100).format('0,0.00') + '%)'
						];
					
					callback(info);
				} else {
					callback(project);
				}
			}
		});
	},
	
	requestGoalChanges: function(callback) {
		function addS(n) {
    		return (Math.abs(n)==1? '':'s');
  		}
  		
  		this.requestProject(function(project) {
  			if (isFunction(callback)) {
				if (typeof project === 'object') {
					var backers = project.backers_count;
					var pledged = project.pledged;
			
					var lastPledged = storage.getItem("ks_pledged");
					var lastBackers = storage.getItem("ks_backers");
					storage.setItem("ks_pledged", pledged);
					storage.setItem("ks_backers", backers);
					
					var trackGoalsLimit = funding.isTrackGoalsLimit();
					var info = '';
					if (backers > lastBackers) {
						for (var curBackers = (funding.isTrackGoalsPolite()?backers:lastBackers+1); curBackers<=backers; curBackers++) {
							var currentBackerGoal = kickstarter.currentOrNextGoal(curBackers, kickstarter.backerStretchGoals);
							if (!trackGoalsLimit || ((currentBackerGoal.amount-curBackers)<=config.trackingGoalsBackersRange)) {
								var backersChange = curBackers-lastBackers;
								info +=  (info.length>0?'\n':'')+'Next Backers Goal: ' + currentBackerGoal.title + ' - ' + (numeral(currentBackerGoal.amount-curBackers).format('0,0')) + ' left, ' + numeral(curBackers).format('0,0') + ' of ' + numeral(currentBackerGoal.amount).format('0,0') + ' (' + numeral(curBackers/currentBackerGoal.amount*100).format('0,0.00') + '%)';
								info += ' (+'+numeral(backersChange).format('0,0')+' backer'+addS(backersChange)+')';
							}
						}
					}
					
					if (pledged > lastPledged) {
						var currentPledgeGoal = kickstarter.currentOrNextGoal(pledged, kickstarter.pledgeStretchGoals);
						if (!trackGoalsLimit || ((currentPledgeGoal.amount-pledged)<=config.trackingGoalsPledgeRange)) {
							var pledgedChange = pledged-lastPledged;
							info +=  (info.length>0?'\n':'')+'Next Pledge Goal: ' + currentPledgeGoal.title + ' - $' + (numeral(currentPledgeGoal.amount-pledged).format('0,0.00')) + ' left, $' + numeral(pledged).format('0,0.00') + ' of $' + numeral(currentPledgeGoal.amount).format('0,0.00') + ' (' + numeral(pledged/currentPledgeGoal.amount*100).format('0,0.00') + '%)';
							info += ' (+$'+numeral(pledgedChange).format('0,0.00')+' pledged)';
						}
					}
					callback(info);
				} else {
					callback('');
				}
			}
		});
	},
	
	monitorLimitedPledges: function() {
		if (config.monitorLimitedPledges) {
			kickstarter.checkLimitedPledges();
		}
	},
	
	isLimitedPledge: function(index, isUser) {
		if (isUser) {
			return (index == 1 ||
					index == 2 ||
					index == 3 ||
					index == 8 ||
					index == 10 ||
					index == 12 ||
					index == 16 ||
					index == 17);
		} else {
			return (index == 8 ||
					index == 10 ||
					index == 12 ||
					index == 16 ||
					index == 17);
		}
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
	
	checkLimitedPledges: function(user) {
		function addS(n) {
    		return (Math.abs(n)==1? '':'s');
  		}
  		
		request('https://www.kickstarter.com/projects/crowfall/crowfall-throne-war-pc-mmo', function (error, response, body) {
		  if (!error && response.statusCode == 200) {
		  	//storage.initSync();
		  	
			var isUser = (typeof user === 'string');
			var $ = cheerio.load(body, {normalizeWhitespace: true});
			var rewardsDivs = $('.NS_projects__content .NS-projects-reward').each(function( index ) {
				if (kickstarter.isLimitedPledge(index, isUser)) {
					var title = $(this).find('.desc p:first-child').text().split(':')[0];
					var backers = parseInt($(this).find('.num-backers').text().split(' ')[1].replace(',', ''));
					var lastBackers = storage.getItem(title);
  					storage.setItem(title, backers);
  					if (backers != lastBackers || isUser) {
  						var maxBackers = kickstarter.maxBackersForPledge(index);
  						var openSlots = maxBackers-backers;
  						if (openSlots <= kickstarter.maxOpenSlotsToLog || isUser) {
  							var openSlotChange = lastBackers-backers;
  							var msg = title + ': ' + openSlots + ' slot'+addS(openSlots)+' open!';
  							if (!isUser) {
  								msg += ' ('+(openSlotChange>0?'+':'')+openSlotChange+' slot'+addS(openSlotChange)+')';
  								if (config.showManagePledgeLink && openSlots > 0) {
									msg += '\nhttps://www.kickstarter.com/projects/crowfall/crowfall-throne-war-pc-mmo/pledge/edit?ref=manage_pledge';
								}
  							}
  							botSay((isUser ? user : config.channels[0]), msg);
  							
  							if (!isUser && !config.disableSubscriptions) {
  								var subscribers = storage.getItem('subscribers_'+index);
  								for (var i in subscribers) {
  									var subscriber = subscribers[i];
  									botSay(subscriber, (openSlots>0?'Hurry ':'')+subscriber+'! '+msg);
  								}
  							}
  						}
  					}
  				}
			});
			
			if (!isUser) {
				if (kickstarter.monitorLimitedPledgesInterval)
					clearTimeout(kickstarter.monitorLimitedPledgesTimeoutID);
				var monitorLimitedPledgesTimeoutID = setTimeout(kickstarter.checkLimitedPledges, config.monitorLimitedPledgesInterval);
			}
		  }
		});
	},
	
	subscribeToEarlyBird: function(subscribe, from, pledgeIndex) {
		pledgeIndex--;
		if (!this.isLimitedPledge(pledgeIndex)) {
			botSay(from, 'Error: Failed to '+(subscribe?'subscribe':'unsubscribe')+'. Input valid pledge index. ( 9, 11, 13, 17, 18 )');
			return;
		}
		//storage.initSync();
		if (subscribe) {
			var subscribers = storage.getItem('subscribers_'+pledgeIndex);
			if (typeof subscribers !== 'object') {
				subscribers = [];
			}
			if (arrayContains(subscribers, from)) {
				botSay(from, 'Error: You are already subscribed to pledge '+kickstarter.pledgeNames[pledgeIndex]+' ['+(pledgeIndex+1)+'].');
				return;
			}
			subscribers.push(from);
			storage.setItem('subscribers_'+pledgeIndex, subscribers);
			botSay(from, 'You have subscribed to pledge '+kickstarter.pledgeNames[pledgeIndex]+' ['+(pledgeIndex+1)+'].');
		} else {
			var subscribers = storage.getItem('subscribers_'+pledgeIndex);
			if (typeof subscribers !== 'object') {
				botSay(from, 'Error: You are not subscribed to pledge '+kickstarter.pledgeNames[pledgeIndex]+' ['+(pledgeIndex+1)+'].');
				return;
			}
			if (!arrayRemove(subscribers, from)) {
				botSay(from, 'Error: You are not subscribed to pledge '+kickstarter.pledgeNames[pledgeIndex]+' ['+(pledgeIndex+1)+'].');
				return;
			}
			storage.setItem('subscribers_'+pledgeIndex, subscribers);
			botSay(from, 'You have unsubscribed from pledge '+kickstarter.pledgeNames[pledgeIndex]+' ['+(pledgeIndex+1)+'].');
		}
	},
	
	subscribersForEarlyBird: function(from, pledgeIndex) {
		pledgeIndex--;
		if (!this.isLimitedPledge(pledgeIndex)) {
			botSay(from, 'Error: Failed to list subscribers. Input valid pledge index. ( 9, 11, 13, 17, 18 )');
			return;
		}
		//storage.initSync();
		var info = "Subscribers for pledge "+kickstarter.pledgeNames[pledgeIndex]+" ["+(pledgeIndex+1)+"]:\n";
		var subscribers = storage.getItem('subscribers_'+pledgeIndex);
		if (typeof subscribers !== 'object' || subscribers.length < 1) {
			info += "[None]";
		} else {
			info += subscribers.join(', ');
		}
		botSay(from, info);
	}
};

var crowfallFunding = {
	pledgeStretchGoals: [
		{'title': 'EUROPEAN BETA SERVER & WEBSITE LOCALIZATION', 'amount': 165000},
		{'title': 'NONE', 'amount': 9999999}
	],
	
	currentAndNextGoals: function(amount, goals) {
		var lastGoals = [];
		for (var i in goals) {
		  	var goal = goals[i];
			if (goal.amount <= amount) {
				lastGoals[0] = goal;	
			} else {
				lastGoals.push(goal);
				break;
			}
		}
		return lastGoals;
	},
	
	currentOrNextGoal: function(amount, goals) {
		for (var i in goals) {
		  	var goal = goals[i];
			if (goal.amount >= amount) {
				return goal;
			}
		}
		return goals[goals.length-1];
	},
	
	requestData: function(callback) {
		request('https://api.epicdata.io/api/ecommerce/total', function (error, response, body) {
		  if (isFunction(callback)) {
			  if (!error && response.statusCode == 200) {
				var data = JSON.parse(body);
				callback(data);
			  } else {
				callback("Error retrieving Crowfall funding data. Try again later.");
			  }
		  }
		});
	},
	
	requestSummary: function(callback) {
		this.requestData(function(data) {
			if (isFunction(callback)) {
				if (typeof data === 'object') {
					var name = 'Crowfall.com Official Funding';
					var backers = data.participants;
					var pledged = data.total;
					var currency_symbol = '$';
					var stretchGoalAmount = 165000;
					var stretchGoalName = 'Stretch Goal 1';
					
					var info = name + '\n';
					info += 'Backers: ' + numeral(backers).format('0,0') + '\n';
					info += 'Pledged: ' + currency_symbol + numeral(pledged).format('0,0.00') + ' of ' + currency_symbol + numeral(stretchGoalAmount).format('0,0.00') + ' '+stretchGoalName+' (' + numeral(pledged/stretchGoalAmount*100).format('0,0.00') + '%)\n';
					info += '(Pledge total delayed up to an hour)\n';
					info += 'http://crowfall.com/#/payment';
					
					callback(info, pledged, backers);
				} else {
					callback(project);
				}
			}
		});
	},
	
	requestGoals: function(callback) {
		this.requestData(function(data) {
			if (isFunction(callback)) {
				if (typeof data === 'object') {
					var pledged = data.total;
					
					var currentAndNextPledgeGoals = crowfallFunding.currentAndNextGoals(pledged, crowfallFunding.pledgeStretchGoals);
					
					var info = [];
					if (currentAndNextPledgeGoals.length > 1) {
						info.push('Unlocked Crowfall.com Pledge Goal: ' + currentAndNextPledgeGoals[0].title + ' - $' + numeral(pledged).format('0,0.00') + ' of $' + numeral(currentAndNextPledgeGoals[0].amount).format('0,0.00') + ' (' + numeral(pledged/currentAndNextPledgeGoals[0].amount*100).format('0,0.00') + '%)');
					} else {
						info.push('Unlocked Crowfall.com Pledge Goal: None');
					}
					info.push('Next Crowfall.com Pledge Goal: ' + currentAndNextPledgeGoals[currentAndNextPledgeGoals.length-1].title + ' - $' + numeral(currentAndNextPledgeGoals[currentAndNextPledgeGoals.length-1].amount-pledged).format('0,0.00') + ' left, $' + numeral(pledged).format('0,0.00') + ' of $' + numeral(currentAndNextPledgeGoals[currentAndNextPledgeGoals.length-1].amount).format('0,0.00') + ' (' + numeral(pledged/currentAndNextPledgeGoals[currentAndNextPledgeGoals.length-1].amount*100).format('0,0.00') + '%)');
					
					callback(info);
				} else {
					callback(data);
				}
			}
		});
	},
	
	requestGoalChanges: function(callback) {
		function addS(n) {
    		return (Math.abs(n)==1? '':'s');
  		}
  		
  		this.requestData(function(data) {
  			if (isFunction(callback)) {
				if (typeof data === 'object') {
					var pledged = data.total;
			
					var lastPledged = storage.getItem("cf_pledged");
					storage.setItem("cf_pledged", pledged);
					
					var info = '';
					if (pledged > lastPledged) {
						var trackGoalsLimit = funding.isTrackGoalsLimit();
						var currentPledgeGoal = crowfallFunding.currentOrNextGoal(pledged, crowfallFunding.pledgeStretchGoals);
						if (!trackGoalsLimit || ((currentPledgeGoal.amount-pledged)<=config.trackingGoalsPledgeRange)) {
							var pledgedChange = pledged-lastPledged;
							info +=  (info.length>0?'\n':'')+'Next Crowfall.com Pledge Goal: ' + currentPledgeGoal.title + ' - $' + (numeral(currentPledgeGoal.amount-pledged).format('0,0.00')) + ' left, $' + numeral(pledged).format('0,0.00') + ' of $' + numeral(currentPledgeGoal.amount).format('0,0.00') + ' (' + numeral(pledged/currentPledgeGoal.amount*100).format('0,0.00') + '%)';
							info += ' (+$'+numeral(pledgedChange).format('0,0.00')+' pledged)';
						}
					}
					
					callback(info);
				} else {
					callback('');
				}
			}
		});
	},
};

var funding = {
	trackingGoalsID: null,
	startedMonitoringGoals: false,
	
	requestSummary: function(callback) {
		var kickstarterInfo = null;
		var crowfallFundingInfo = null;
		var kickstarterAmount = 0;
		var crowfallFundingAmount = 0;
		var kickstarterBackers = 0;
		var crowfallFundingBackers = 0;
		
		kickstarter.requestProjectSummary(function(info, amount, backers) {
			kickstarterInfo = info;
			kickstarterAmount = amount;
			kickstarterBackers = backers;
			if (kickstarterInfo && kickstarterInfo)
				funding.sendSummary(callback, kickstarterInfo, crowfallFundingInfo, kickstarterAmount, crowfallFundingAmount, kickstarterBackers, crowfallFundingBackers);
		});
		
		crowfallFunding.requestSummary(function(info, amount, backers) {
			crowfallFundingInfo = info;
			crowfallFundingAmount = amount;
			crowfallFundingBackers = backers;
			if (kickstarterInfo && kickstarterInfo)
				funding.sendSummary(callback, kickstarterInfo, crowfallFundingInfo, kickstarterAmount, crowfallFundingAmount, kickstarterBackers, crowfallFundingBackers);
		});
	},
	
	sendSummary: function(callback, kickstarterInfo, crowfallFundingInfo, kickstarterAmount, crowfallFundingAmount, kickstarterBackers, crowfallFundingBackers) {
		var info = kickstarterInfo + '\n \n' + crowfallFundingInfo + '\n \n';
		info += 'Total Crowdfunding: $'+numeral(kickstarterAmount+crowfallFundingAmount).format('0,0.00') + ' pledged - '+numeral(kickstarterBackers+crowfallFundingBackers).format('0,0')+' backers';
		callback(info);
	},
	
	requestGoals: function(components, callback) {
		var kickstarterInfo = undefined;
		var crowfallFundingInfo = undefined;
		
		var filter = (typeof components === 'object' && components.length > 0 ? components[0].toLowerCase() : null);
		if (filter && filter != 'backers' && filter != 'pledged' && filter != 'crowfall')
			filter = null;
		
		var filter2;
		if (typeof components === 'object' && components.length > 0) {
			if (components.length > 2) {
				filter2 = components[1].toLowerCase();
			} else {
				filter2 = components[components.length-1].toLowerCase();
				if (filter2 && filter2 != 'next' && filter2 != 'current' && components.length == 2) {
					filter2 = components[0].toLowerCase();
				}
			}
		}
		if (filter2 && filter2 != 'next' && filter2 != 'current')
			filter2 = null;
		
		kickstarter.requestGoals(function(info) {
			if (filter == 'backers') {
				if (filter2 == 'next') {
					kickstarterInfo = info[3];
				} else if (filter2 == 'current') {
					kickstarterInfo = info[1];
				} else {
					kickstarterInfo = info[1]+'\n'+info[3];
				}
			} else if (filter == 'pledged') {
				if (filter2 == 'next') {
					kickstarterInfo = info[2];
				} else if (filter2 == 'current') {
					kickstarterInfo = info[0];
				} else {
					kickstarterInfo = info[0]+'\n'+info[2];
				}
			} else if (!filter) {
				if (filter2 == 'next') {
					kickstarterInfo = info[2]+'\n'+info[3];
				} else if (filter2 == 'current') {
					kickstarterInfo = info[0]+'\n'+info[1];
				} else {
					kickstarterInfo = info[0]+'\n'+info[1]+'\n'+info[2]+'\n'+info[3];
				}
			} else {
				kickstarterInfo = null;
			}
			
			if (kickstarterInfo !== undefined && crowfallFundingInfo !== undefined)
				funding.sendGoals(callback, kickstarterInfo, crowfallFundingInfo);
		});
		
		if (!filter || filter == 'crowfall') {
			crowfallFunding.requestGoals(function(info) {
				if (filter2 == 'next') {
					crowfallFundingInfo = info[1];
				} else if (filter2 == 'current') {
					crowfallFundingInfo = info[0];
				} else {
					crowfallFundingInfo = info[0]+'\n'+info[1];
				}
				if (kickstarterInfo !== undefined && crowfallFundingInfo !== undefined)
					funding.sendGoals(callback, kickstarterInfo, crowfallFundingInfo);
			});
		} else {
			crowfallFundingInfo = null;
		}
	},
	
	sendGoals: function(callback, kickstarterInfo, crowfallFundingInfo) {
		var info;
		if (kickstarterInfo && crowfallFundingInfo) {
			info = kickstarterInfo+'\n'+crowfallFundingInfo;
		} else if (crowfallFundingInfo) {
			info = crowfallFundingInfo;
		} else {
			info = kickstarterInfo;
		}
		callback(info);
	},
	
	trackGoals: function(shouldTrack, from, shouldPM) {
		if (shouldTrack == this.isTrackingGoals()) {
			botSay((shouldPM ? from : config.channels[0]), "Tracking goals is already: ["+(this.isTrackingGoals()?"on":"off")+"]");
			return;
		}
		storage.setItem("trackGoals", JSON.stringify(shouldTrack));
		this.startMonitorGoals();
		botSay((shouldPM ? from : config.channels[0]), "Tracking goals: ["+(this.isTrackingGoals()?"on":"off")+"]");
	},
	
	limitTrackGoals: function(shouldLimit, from, shouldPM) {
		if (shouldLimit == this.isTrackGoalsLimit()) {
			botSay((shouldPM ? from : config.channels[0]), "Tracking goal limiter is already: ["+(this.isTrackGoalsLimit()?"on":"off")+"]");
			return;
		}
		storage.setItem("trackGoalsLimit", JSON.stringify(shouldLimit));
		botSay((shouldPM ? from : config.channels[0]), "Tracking goal limiter: ["+(this.isTrackGoalsLimit()?"on":"off")+"]");
	},
	
	sayLimitTrackGoals: function(from, shouldPM) {
		botSay((shouldPM ? from : config.channels[0]), "Tracking goal limiter: ["+(this.isTrackGoalsLimit()?"on":"off")+"]");
	},
	
	politeTrackGoals: function(shouldPolite, from, shouldPM) {
		if (shouldPolite == this.isTrackGoalsPolite()) {
			botSay((shouldPM ? from : config.channels[0]), "Tracking goal polite mode is already: ["+(this.isTrackGoalsPolite()?"on":"off")+"]");
			return;
		}
		storage.setItem("trackGoalsPolite", JSON.stringify(shouldPolite));
		botSay((shouldPM ? from : config.channels[0]), "Tracking goal polite mode: ["+(this.isTrackGoalsPolite()?"on":"off")+"]");
		this.startMonitorGoals();
	},
	
	sayPoliteTrackGoals: function(from, shouldPM) {
		botSay((shouldPM ? from : config.channels[0]), "Tracking goal polite mode: ["+(this.isTrackGoalsPolite()?"on":"off")+"]");
	},
	
	isTrackGoalsLimit: function() {
		var trackGoalsLimitObj = storage.getItem("trackGoalsLimit");
		if (typeof trackGoalsLimitObj === 'string') {
			var trackGoalsLimit = JSON.parse(trackGoalsLimitObj);
			if (typeof trackGoalsLimit === 'boolean') {
				return trackGoalsLimit;
			}
		}
		return true;
	},
	
	isTrackGoalsPolite: function() {
		var trackGoalsPoliteObj = storage.getItem("trackGoalsPolite");
		if (typeof trackGoalsPoliteObj === 'string') {
			var trackGoalsPolite = JSON.parse(trackGoalsPoliteObj);
			if (typeof trackGoalsPolite === 'boolean') {
				return trackGoalsPolite;
			}
		}
		return false;
	},
	
	startMonitorGoals: function() {
		clearInterval(this.trackingGoalsID);
		this.trackingGoalsID = null;
		if (this.isTrackingGoals()) {
			funding.startedMonitoringGoals = true;
			this.requestGoalChanges();
		}
	},
	
	monitorGoals: function() {
		clearInterval(this.trackingGoalsID);
		this.trackingGoalsID = null;
		if (this.isTrackingGoals()) {
			this.trackingGoalsID = setTimeout(this.requestGoalChanges, (this.isTrackGoalsPolite() ? config.trackingGoalsPoliteInterval : config.trackingGoalsInterval));
		}
	},
	
	requestGoalChanges: function() {
		var kickstarterInfo = null;
		var crowfallFundingInfo = null;
		
		kickstarter.requestGoalChanges(function(info) {
			kickstarterInfo = info;
			if (kickstarterInfo != null && crowfallFundingInfo != null) {
				funding.sendGoalChanges(kickstarterInfo, crowfallFundingInfo);
			}
		});
		
		crowfallFunding.requestGoalChanges(function(info) {
			crowfallFundingInfo = info;
			if (kickstarterInfo != null && crowfallFundingInfo != null) {
				funding.sendGoalChanges(kickstarterInfo, crowfallFundingInfo);
			}
		});
	},
	
	sendGoalChanges: function(kickstarterInfo, crowfallFundingInfo) {
		if (funding.startedMonitoringGoals) {
			funding.startedMonitoringGoals = false;
			this.monitorGoals();
			return;
		}
				
		var info = null;
		if (kickstarterInfo.length>0 && crowfallFundingInfo.length>0) {
			info = kickstarterInfo + '\n' + crowfallFundingInfo;
		} else if (kickstarterInfo.length>0) {
			info = kickstarterInfo;
		} else if (crowfallFundingInfo.length>0) {
			info = crowfallFundingInfo;
		}
		
		if (info) {
			botSay(config.channels[0], info);
		}
		this.monitorGoals();
	},
	
	isTrackingGoals: function() {
		var trackGoalsObj = storage.getItem("trackGoals");
		if (typeof trackGoalsObj === 'string') {
			var trackGoals = JSON.parse(trackGoalsObj);
			if (typeof trackGoals === 'boolean') {
				return trackGoals;
			}
		}
		return false;
	}
};

var bot = new irc.Client(config.server, config.botName, {
	channels: config.channels,
	//nick: config.botName,
	userName: config.botName,
    realName: config.botRealName,
    //password: config.password,
    showErrors: true,
    autoRejoin: true,
    autoConnect: false,
    floodProtection: true,
    debug: false,
    //sasl: true
});

var commander = {
	execute: function(text, from, shouldPM, callback) {
		if (strStartsWith(text, config.commandPrefix)) {
			var components = text.substr(1).split(' ');
			var command = components.shift().toLowerCase();
			var func = commander[command];
			var funcCallback = isFunction(callback) ? callback : this.defaultCallback;
			if (isFunction(func))
				func(funcCallback, from, shouldPM, components);
		}
	},
	
	defaultCallback: function(msg, from, shouldPM) {
		var to = (shouldPM && typeof from === 'string' ? from : config.channels[0]);
		botSay(to, msg);
	},
	
	help: function(callback, from, shouldPM) {
		var help = 'About me:\n';
		help += 'I actively monitor and announce the Kickstarter limited pledges\' available slots every '+Math.round(config.monitorLimitedPledgesInterval/1000)+' seconds. I can also tell you more info about Crowfall and the Kickstarter. I am also open source here: https://github.com/Shilo/CrowBot\n';
		help += 'Command list:\n';
		help += '!help, !h - This help menu.\n';
		if (config.disableSubscriptions) {
			help += '!earlybird, !eb - Check open slots of limited Kickstarter pledges.\n';
		} else {
			help += '!earlybird, !eb [subscribe, unsubscribe, subscribers] [{PLEDGE INDEX OR FULL NAME}] - Check or subscribe to open slots of limited Kickstarter pledges.\n';
		}
		help += '!kickstarter, !ks [title, backers, pledged, time, url] [say] - Current data of the Crowfall Kickstarter.\n';
		help += '!cfFunding, !cff [title, backers, pledged, delay, url] [say] - Recent data of Crowfall.com official funding.\n';
		help += '!funding, !f [total] [say] - Current data of both Kickstarter and Crowfall.com official funding.\n';
		help += '!goal, !g [backers, pledged, crowfall] [next, current] [say] - Stretch goal progress.\n';
		help += '!goal track, !g track [on, off] - Stretch goal automatic and manual tracking.\n';
		help += '!goal track limit, !g track limit [on, off] - Stretch goal automatic tracking limiter. When on, stretch goal progress will only be announced within $' + (numeral(config.trackingGoalsPledgeRange).format('0,0.00')) + ' pledged and ' + (numeral(config.trackingGoalsBackersRange).format('0,0')) + ' backers.\n';
		help += '!goal track polite, !g track polite [on, off] - Stretch goal automatic tracking polite mode. When on, it will only announce progress every ' + (config.trackingGoalsPoliteInterval/60000) + ' mins and only announce new backers once per message.';
		
		shouldPM = true;
		callback(help, from, shouldPM);
	},
	
	h: function(callback, from, shouldPM) {
		commander.help(callback, from, shouldPM);
	},
	
	kickstarter: function(callback, from, shouldPM, components) {
		kickstarter.requestProjectSummary(function(info) {
			if (typeof components === 'object' && components.length > 0) {
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
						info = infoLines[3];
						break;
					case 'url':
						info = infoLines[4];
						break;
				}
			}
			if (shouldPM == false && !(typeof components === 'object' && components.length > 0 && components[components.length-1].toLowerCase() == 'say')) {
				shouldPM = true;
			}
			callback(info, from, shouldPM)
		});
	},
	
	ks: function(callback, from, shouldPM, components) {
		commander.kickstarter(callback, from, shouldPM, components);
	},
	
	earlybird: function(callback, from, shouldPM, components) {
		if (!config.disableSubscriptions && typeof components === 'object' && components.length > 0) {
			var type = components.shift().toLowerCase();
			var pledgeIdentity = components.join(' ').trim();
			var pledgeIndex = (components.length>0?parseInt(pledgeIdentity):0);
			if ((isNaN(pledgeIndex) || pledgeIndex < 1) && components.length>0) {
				pledgeIndex = arrayIndexCaseInsensitive(kickstarter.pledgeNames, pledgeIdentity)+1;
			}
			switch (type) {
				case 'subscribe':
					kickstarter.subscribeToEarlyBird(true, from, pledgeIndex);
					return;
				case 'unsubscribe':
					kickstarter.subscribeToEarlyBird(false, from, pledgeIndex);
					return;
				case 'subscribers':
					kickstarter.subscribersForEarlyBird(from, pledgeIndex);
					return;
			}
		}
		kickstarter.checkLimitedPledges(from);
	},
	
	eb: function(callback, from, shouldPM, components) {
		commander.earlybird(callback, from, shouldPM, components);
	},
	
	cffunding: function(callback, from, shouldPM, components) {
		crowfallFunding.requestSummary(function(info) {
			if (typeof components === 'object' && components.length > 0) {
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
				}
			}
			if (shouldPM == false && !(typeof components === 'object' && components.length > 0 && components[components.length-1].toLowerCase() == 'say')) {
				shouldPM = true;
			}
			callback(info, from, shouldPM)
		});
	},
	
	cff: function(callback, from, shouldPM, components) {
		commander.cffunding(callback, from, shouldPM, components);
	},
	
	funding: function(callback, from, shouldPM, components) {
		funding.requestSummary(function(info) {
			if (typeof components === 'object' && components.length > 0) {
				var infoLines = info.split('\n');
				var type = components[0].toLowerCase();
				switch (type) {
					case 'total':
						info = infoLines[infoLines.length-1];
						break;
				}
			}
			if (shouldPM == false && !(typeof components === 'object' && components.length > 0 && components[components.length-1].toLowerCase() == 'say')) {
				shouldPM = true;
			}
			callback(info, from, shouldPM)
		});
	},
	
	f: function(callback, from, shouldPM, components) {
		commander.funding(callback, from, shouldPM, components);
	},
	
	goal: function(callback, from, shouldPM, components) {
		var type = (typeof components === 'object' && components.length>0 ?components[0].toLowerCase():null);
		if (type == 'track') {
			components[0] = 'next';
			if (components.length>1) {
				var shouldTrack = components[1].toLowerCase();
				if (shouldTrack == 'on' || shouldTrack == 'true' || shouldTrack == '1') {
					if (components[components.length-1].toLowerCase() != 'say') {
						shouldPM = true;
					}
					funding.trackGoals(true, from, shouldPM);
					return;
				} else if (shouldTrack == 'off' || shouldTrack == 'false' || shouldTrack == '0') {
					if (components[components.length-1].toLowerCase() != 'say') {
						shouldPM = true;
					}
					funding.trackGoals(false, from, shouldPM);
					return;
				} else if (shouldTrack == 'limit') {
					var shouldLimit = (components.length>2? components[2].toLowerCase() : null);
					if (shouldLimit == 'on' || shouldLimit == 'true' || shouldLimit == '1') {
						if (components[components.length-1].toLowerCase() != 'say') {
							shouldPM = true;
						}
						funding.limitTrackGoals(true, from, shouldPM);
						return;
					} else if (shouldLimit == 'off' || shouldLimit == 'false' || shouldLimit == '0') {
						if (components[components.length-1].toLowerCase() != 'say') {
							shouldPM = true;
						}
						funding.limitTrackGoals(false, from, shouldPM);
						return;
					} else {
						if (components[components.length-1].toLowerCase() != 'say') {
							shouldPM = true;
						}
						funding.sayLimitTrackGoals(from, shouldPM);
						return;
					}
				} else if (shouldTrack == 'polite') {
					var shouldPolite = (components.length>2? components[2].toLowerCase() : null);
					if (shouldPolite == 'on' || shouldPolite == 'true' || shouldPolite == '1') {
						if (components[components.length-1].toLowerCase() != 'say') {
							shouldPM = true;
						}
						funding.politeTrackGoals(true, from, shouldPM);
						return;
					} else if (shouldPolite == 'off' || shouldPolite == 'false' || shouldPolite == '0') {
						if (components[components.length-1].toLowerCase() != 'say') {
							shouldPM = true;
						}
						funding.politeTrackGoals(false, from, shouldPM);
						return;
					} else {
						if (components[components.length-1].toLowerCase() != 'say') {
							shouldPM = true;
						}
						funding.sayPoliteTrackGoals(from, shouldPM);
						return;
					}
				}
			}
		}
		
		funding.requestGoals(components, function(info) {
			if (typeof components === 'object' && components.length > 0) {
				if (components[components.length-1].toLowerCase() != 'say') {
					shouldPM = true;
				}
				switch (type) {
					case 'track':
						info = "Tracking goals: ["+(funding.isTrackingGoals()?"on":"off")+"]\n" + info;
						callback(info, from, shouldPM);
						return;
				}
			} else {
				shouldPM = true;
			}
			callback(info, from, shouldPM);
		});
	},
	
	g: function(callback, from, shouldPM, components) {
		commander.goal(callback, from, shouldPM, components);
	}
}

bot.addListener("message", function(from, to, text, message) {
	commander.execute(text, from, (to == config.validBotName()));
	//console.log("from: "+from+" to:"+to+" text:"+text);
});

function greetedList() {
	var greeted = storage.getItem('greeted');
	if (typeof greeted !== 'object') {
		greeted = [];
	}
	return greeted;
}

function saveGreetedList(greeted) {
	storage.setItem('greeted', greeted);
}

function pmGreeting(who) {
	if (!config.showGreetingPM) return;
	
	var greeted = greetedList();
	if (arrayContains(greeted, who)) {
		return;
	}
	greeted.push(who);
	saveGreetedList(greeted);
	
	botSay(who, config.greetingPM);
}

bot.addListener("join", function(channel, who) {
	if (!config.assignedBotName) {
		storage.initSync();
		config.assignedBotName = who
		console.log("Joined channel \""+config.channels[0]+"\" as nickname \""+who+"\".");
		//botSay("Q", "auth "+config.botName+" "+config.password);
		if (config.showGreetingSay)
			botSay(config.channels[0], config.greetingSay);
		kickstarter.monitorLimitedPledges();
		funding.startMonitorGoals();
	} else {
		pmGreeting(who);
	}
});

bot.addListener('error', function(message) {
    console.log('ERROR: '+message);
});

console.log("Connecting to \""+config.server+" "+config.channels[0]+"\"...");
bot.connect();;