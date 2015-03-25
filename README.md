# CrowBot
An IRC bot, code-named CrowBot, to track Crowfall's Kickstarter and official website. The bot(s) may be used to track other Kickstarters, if the code is moderately modified. Code is Written in Node.js.<br/>

##Crowfall
* http://www.crowfall.com
* https://www.kickstarter.com/projects/crowfall/crowfall-throne-war-pc-mmo/

##Installation
Download and install the following tools:  
* Node.js: https://nodejs.org/
* Node.js IRC client library: https://github.com/martynsmith/node-irc
* Node.js numeral library: http://numeraljs.com/
* Node.js cheerio library: http://cheeriojs.github.io/cheerio/
* Node.js node-persist library: https://github.com/joeferner/node-persist

##Configuration
Edit the 'config' objects in the 'js' source files. Description of bots are commented at the top of the source files.

##Run
Mac:
* Open the appropriate 'command' file in 'exe/mac/' or run the below command(s) in terminal.

Windows:
* Run the below command(s) in command prompt.

> node "path/to/CrowBot.js"
> node "path/to/CrowBotEB.js"
> node "path/to/CrowBotMaid.js"