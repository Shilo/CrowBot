var Request = require('request');
var Numeral = require('numeral');
var Util = require('./Util.js');
var Config = require('./Config.js');

module.exports = {
	requestData: function(callback) {
		Request('https://www.kickstarter.com/projects/search.json?search=&term='+Config.kickstarter.title, function (error, response, body) {
		  if (Util.isFunction(callback)) {
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
			if (Util.isFunction(callback)) {
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
			if (Util.isFunction(callback)) {
				if (typeof project === 'object') {
					var name = project.name;
					var state = project.state;
					var backers = project.backers_count;
					var pledged = project.pledged;
					var currency_symbol = project.currency_symbol;
					var goal = project.goal;
					
					var info = 'Kickstarter: ' + name + '\n';
					info += 'Backers: ' + Numeral(backers).format('0,0') + '\n';
					info += 'Pledged: ' + currency_symbol + Numeral(pledged).format('0,0.00') + ' of ' + currency_symbol + Numeral(goal).format('0,0.00') + ' (' + Numeral(pledged/goal*100).format('0,0.00') + '%)\n';
					if (state == 'live') {
						var deadline = project.deadline;
						var currentTime = new Date().getTime();
						var timeLeft = Utils.msToTime(parseInt(deadline) * 1000 - currentTime);
						info += 'Time left: ' + timeLeft + '\n';
					} else {
						info += 'State: ' + Util.capitalizeString(state) + '\n';
					}
					info += Config.kickstarter.url;
					
					callback(info, pledged, backers);
				} else {
					callback(project);
				}
			}
		});
	}
};