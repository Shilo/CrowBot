var Request = require('request');
var Numeral = require('numeral');
var Storage = require('node-persist');
var Util = require('./Util.js');
var Config = require('./Config.js');

var CrowfallFunding = module.exports = {
	trackingGoalsID: null,
	startedMonitoringGoals: false,
	bot: null,
	
	pledgeStretchGoals: [
		{'title': 'EUROPEAN BETA SERVER & WEBSITE LOCALIZATION', 'amount': 165000},
		{'title': 'HIRE GRAPHICS PROGRAMMER', 'amount': 1850000},
		{'title': 'NONE', 'amount': 9999999}
	],
	
	init: function() {
		this.startMonitorGoals();
	},
	
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
		Request(Config.crowfallFunding.json, function (error, response, body) {
		  if (Util.isFunction(callback)) {
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
			if (Util.isFunction(callback)) {
				if (typeof data === 'object') {
					var name = 'Crowfall.com Official Funding';
					var backers = data.participants;
					var pledged = data.total;
					var currency_symbol = '$';
					var currentPledgeGoal = CrowfallFunding.currentOrNextGoal(pledged, CrowfallFunding.pledgeStretchGoals);
					var stretchGoalAmount = currentPledgeGoal.amount;
					var stretchGoalName = currentPledgeGoal.title;
					
					var info = name + '\n';
					info += 'Backers: ' + Numeral(backers).format('0,0') + '\n';
					info += 'Pledged: ' + currency_symbol + Numeral(pledged).format('0,0.00') + ' of ' + currency_symbol + Numeral(stretchGoalAmount).format('0,0.00') + ' '+stretchGoalName+' (' + Numeral(pledged/stretchGoalAmount*100).format('0,0.00') + '%)\n';
					info += '(Pledge total delayed up to an hour)\n';
					info += Config.crowfallFunding.url;
					
					callback(info, pledged, backers);
				} else {
					callback(project);
				}
			}
		});
	},
	
	requestStatData: function(callback) {
		Request(Config.crowfallFunding.statsJSON, function (error, response, body) {
		  if (Util.isFunction(callback)) {
			  if (!error && response.statusCode == 200) {
				var data = JSON.parse(body);
				var hour = data['1h'];
				var day = data['24h'];
				var week = data['1w'];
				var month = data['1m'];
				
				var info = 'Hour: $'+ Numeral(hour).format('0,0.00') + ' pledged.\n';
				info += 'Day: $'+ Numeral(day).format('0,0.00') + ' pledged.\n';
				info += 'Week: $'+ Numeral(week).format('0,0.00') + ' pledged.\n';
				info += 'Month: $'+ Numeral(month).format('0,0.00') + ' pledged.';
				
				callback(info);
			  } else {
				callback("Error retrieving Crowfall funding statistics. Try again later.");
			  }
		  }
		});
	},
	
	requestGoals: function(components, callback) {
		this.requestData(function(data) {
			if (Util.isFunction(callback)) {
				if (typeof data === 'object') {
					var pledged = data.total;
					
					var currentAndNextPledgeGoals = CrowfallFunding.currentAndNextGoals(pledged, CrowfallFunding.pledgeStretchGoals);
					
					var info = [];
					if (currentAndNextPledgeGoals.length > 1) {
						info.push('Unlocked Pledge Goal: ' + currentAndNextPledgeGoals[0].title + ' - $' + Numeral(pledged).format('0,0.00') + ' of $' + Numeral(currentAndNextPledgeGoals[0].amount).format('0,0.00') + ' (' + Numeral(pledged/currentAndNextPledgeGoals[0].amount*100).format('0,0.00') + '%)');
					} else {
						info.push('Unlocked Pledge Goal: None');
					}
					info.push('Next Pledge Goal: ' + currentAndNextPledgeGoals[currentAndNextPledgeGoals.length-1].title + ' - $' + Numeral(currentAndNextPledgeGoals[currentAndNextPledgeGoals.length-1].amount-pledged).format('0,0.00') + ' left, $' + Numeral(pledged).format('0,0.00') + ' of $' + Numeral(currentAndNextPledgeGoals[currentAndNextPledgeGoals.length-1].amount).format('0,0.00') + ' (' + Numeral(pledged/currentAndNextPledgeGoals[currentAndNextPledgeGoals.length-1].amount*100).format('0,0.00') + '%)');
					
					var crowfallFundingInfo;
					var filter = Util.isArrayWithLength(components) ? components[0].toLowerCase() : null;
					if (filter == 'next') {
						crowfallFundingInfo = info[1];
					} else if (filter == 'current' || filter == 'unlocked') {
						crowfallFundingInfo = info[0];
					} else {
						crowfallFundingInfo = info[0]+'\n'+info[1];
					}
					callback(crowfallFundingInfo);
				} else {
					callback(data);
				}
			}
		});
	},
	
	requestGoalChanges: function() {
		function addS(n) {
    		return (Math.abs(n)==1? '':'s');
  		}
  		
  		CrowfallFunding.requestData(function(data) {
			if (typeof data === 'object') {
				var pledged = data.total;
		
				var lastPledged = Storage.getItem("cf_pledged");
				Storage.setItem("cf_pledged", pledged);
				
				var info = '';
				if (pledged > lastPledged) {
					var currentPledgeGoal = CrowfallFunding.currentOrNextGoal(pledged, CrowfallFunding.pledgeStretchGoals);
					var pledgedChange = pledged-lastPledged;
					info +=  (info.length>0?'\n':'')+'Next Crowfall.com Pledge Goal: ' + currentPledgeGoal.title + ' - $' + (Numeral(currentPledgeGoal.amount-pledged).format('0,0.00')) + ' left, $' + Numeral(pledged).format('0,0.00') + ' of $' + Numeral(currentPledgeGoal.amount).format('0,0.00') + ' (' + Numeral(pledged/currentPledgeGoal.amount*100).format('0,0.00') + '%)';
					info += ' (+$'+Numeral(pledgedChange).format('0,0.00')+' pledged)';
				}
				
				CrowfallFunding.sendGoalChanges(info);
			} else {
				CrowfallFunding.sendGoalChanges(null);
			}
		});
	},
	
	trackGoals: function(shouldTrack, from, yell) {
		if (shouldTrack == this.isTrackingGoals()) {
			CrowfallFunding.bot.say("Tracking goals is already: ["+(this.isTrackingGoals()?"on":"off")+"]", from, yell);
			return;
		}
		Storage.setItem("trackGoals", JSON.stringify(shouldTrack));
		this.startMonitorGoals();
		if (!yell) {
			CrowfallFunding.bot.say("Tracking goals: ["+(this.isTrackingGoals()?"on":"off")+"]", from, yell);
		}
		CrowfallFunding.bot.say("Tracking goals: ["+(this.isTrackingGoals()?"on":"off")+"] (Changed by "+from+")", from, true);
	},
	
	startMonitorGoals: function() {
		clearTimeout(CrowfallFunding.trackingGoalsID);
		CrowfallFunding.trackingGoalsID = null;
		if (CrowfallFunding.isTrackingGoals()) {
			CrowfallFunding.startedMonitoringGoals = true;
			CrowfallFunding.requestGoalChanges();
		}
	},
	
	monitorGoals: function() {
		clearInterval(CrowfallFunding.trackingGoalsID);
		CrowfallFunding.trackingGoalsID = null;
		if (CrowfallFunding.isTrackingGoals()) {
			CrowfallFunding.trackingGoalsID = setTimeout(CrowfallFunding.requestGoalChanges, Config.crowfallFunding.trackingGoalsInterval);
		}
	},
	
	sendGoalChanges: function(info) {
		if (CrowfallFunding.startedMonitoringGoals) {
			CrowfallFunding.startedMonitoringGoals = false;
			CrowfallFunding.monitorGoals();
			return;
		}
		
		if (info) {
			CrowfallFunding.bot.say(info, undefined, false);
		}
		CrowfallFunding.monitorGoals();
	},
	
	isTrackingGoals: function() {
		var trackGoalsObj = Storage.getItem("trackGoals");
		if (typeof trackGoalsObj === 'string') {
			var trackGoals = JSON.parse(trackGoalsObj);
			if (typeof trackGoals === 'boolean') {
				return trackGoals;
			}
		}
		return false;
	}
};