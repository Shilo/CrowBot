module.exports = {
	isFunction: function(object) {
  		return Object.prototype.toString.call(object) == '[object Function]';
	},

	stringStartsWith: function(string, prefix) {
    	return string.indexOf(prefix) === 0;
	},
	
	isArrayAtLeastLength: function(array, length) {
		return (typeof array === 'object' && array.length >= length);
	},
	
	isArrayWithLength: function(array) {
		return (typeof array === 'object' && array.length > 0);
	},
	
	msToTime: function(s) {
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
	},
	
	capitalizeString: function(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	},
	
	stringWithoutLastLine: function(string) {
		return string.substring(0, string.lastIndexOf("\n"))
	},
	
	arrayContains: function(array, obj) {
		var i = array.length;
		while (i--) {
		   if (array[i] === obj) {
			   return true;
		   }
		}
		return false;
	},
	
	isMultilineString: function(string) {
		return (string.indexOf('\n') != -1);
	},
};