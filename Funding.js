var Request = require('request');
var Numeral = require('numeral');
var Util = require('./Util.js');
var Kickstarter = require('./Kickstarter.js');
var CrowfallFunding = require('./CrowfallFunding.js');

var Funding = module.exports = {
	requestSummary: function(callback) {
		var kickstarterInfo = null;
		var crowfallFundingInfo = null;
		var kickstarterAmount = 0;
		var crowfallFundingAmount = 0;
		var kickstarterBackers = 0;
		var crowfallFundingBackers = 0;
		
		Kickstarter.requestProjectSummary(function(info, amount, backers) {
			kickstarterInfo = Util.stringWithoutLastLine(info);
			kickstarterAmount = amount;
			kickstarterBackers = backers;
			if (kickstarterInfo && crowfallFundingInfo)
				Funding.sendSummary(callback, kickstarterInfo, crowfallFundingInfo, kickstarterAmount, crowfallFundingAmount, kickstarterBackers, crowfallFundingBackers);
		});
		
		CrowfallFunding.requestSummary(function(info, amount, backers) {
			crowfallFundingInfo = Util.stringWithoutLastLine(info);
			crowfallFundingAmount = amount;
			crowfallFundingBackers = backers;
			if (kickstarterInfo && crowfallFundingInfo)
				Funding.sendSummary(callback, kickstarterInfo, crowfallFundingInfo, kickstarterAmount, crowfallFundingAmount, kickstarterBackers, crowfallFundingBackers);
		});
	},
	
	sendSummary: function(callback, kickstarterInfo, crowfallFundingInfo, kickstarterAmount, crowfallFundingAmount, kickstarterBackers, crowfallFundingBackers) {
		var info = kickstarterInfo + '\n' + crowfallFundingInfo + '\n';
		info += 'Total Crowdfunding: $'+Numeral(kickstarterAmount+crowfallFundingAmount).format('0,0.00') + ' pledged - '+Numeral(kickstarterBackers+crowfallFundingBackers).format('0,0')+' backers';
		callback(info);
	}
};