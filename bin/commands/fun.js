var Command = require('../commandTemplate');
var Connection = require('../db/dbConnection');
var levels = require('../../consts/levels.json');
var paramtypes = require('../../consts/paramtypes.json');
var utils = require('../utils/utils');
var discordUtils = require('../utils/discordUtils');
var dbUtils = require('../db/dbUtils');
var dbGuild = require('../db/dbGuild');
var https = require('https');
var commands = [];

var cmd;
////////////////////////////////////////////////////////////
cmd = new Command('otp', 'Fun');
cmd.addHelp('Returns a random ship');
cmd.minLvl = levels.DEFAULT;
cmd.cd = 30;
cmd.execution = function(client, msg, suffix) {
    var members = msg.guild.members.array();
    var current = utils.getRandom(0, members.length - 1);
    var chosen = [];
    dbUtils.getLevel(msg.guild, members[current], check);

	// Iterate over users until we find the data or we consume it
    function check(err, level) {
        if (members.length != 0 && chosen.length != 2) {
            // Store user is its valid
			if (!err && level > -1) {
                chosen.push(members[current]);
            }
            members.splice(current, 1);
            current = utils.getRandom(0, members.length - 1);
			//New call to the method
            dbUtils.getLevel(msg.guild, members[current], check);
        }
    }
	// If we've got no members.
    if (chosen.length != 2) {
        msg.channel.sendMessage('There are no valid OTP :broken_heart:');
        return;
    }
    msg.channel.sendMessage(':revolving_hearts: ' + chosen[0].user.username + " x " + chosen[1].user.username + ' :revolving_hearts:');
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('randu', 'Fun');
cmd.addHelp('Returns a random member');
cmd.minLvl = levels.DEFAULT;
cmd.cd = 20;
cmd.execution = function(client, msg, suffix) {

    var members = msg.guild.members.array();
    var member = members[utils.getRandom(0, members.length - 1)];
    var i = 0;
    dbUtils.getLevel(msg.guild, member, checkFirst);

    function checkFirst(err, res) {
        if (res > -1) {
            msg.channel.sendMessage(`:arrow_forward:  |  **${member.user.username}** has been selected!`);
        } else {
			members.splice(current, 1);
            member = members[utils.getRandom(0, members.length - 1)];
            dbUtils.getLevel(msg.guild, member, checkFirst);
        }
    }
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('suicide', 'Fun');
cmd.alias.push('die');
cmd.addHelp('Mutes a user for a random time');
cmd.minLvl = levels.DEFAULT;
cmd.execution = function(client, msg, suffix) {

    var num = utils.getRandom(1, 1000);
    var time;
    if (num >= 900) {
        time = 3600 * 1000;
    } else {
        time = num * 2000;
    }

    var member = msg.member;
    var role = msg.guild.roles.find((r) => r.name.toLowerCase() == "muted");

    if (!role) return discordUtils.sendAndDelete(msg.channel, "Role not found!");
    member.addRole(role).then(r => {
        dbUtils.insertTimer(Date.now(), time, member.user.id, role.id, msg.guild.id, function() {});
        msg.channel.sendMessage(`:no_bell:  |  **${member.user.username}** you are dead for ${utils.convertUnixToDate(time).toLowerCase().slice(0, -1)}!`, 8000);
        setTimeout(() => {
            member.removeRole(role).then(() => {}).catch(console.log);
            dbUtils.removeTimer(member.user.id, r.id, function() {});
        }, time);
    }).catch(err => discordUtils.sendAndDelete(msg.channel, ':warning: Bot error! ' + err.response.body.message));
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('ask', 'Fun');
cmd.alias.push('8ball', 'question');
cmd.addHelp('Answers a question');
cmd.minLvl = levels.DEFAULT;
cmd.cd = 20;
cmd.execution = function(client, msg, suffix) {
    if (suffix.length == 0) {
        return msg.channel.sendMessage("Ask a question!");
    }
    var question = suffix.join("+");
    https.get({
        host: '8ball.delegator.com',
        path: '/magic/JSON/' + question,
    }, function(response) {
        // Continuously update stream with data
        var body = '';
        response.on('data', function(d) {
            body += d;
        });
        response.on('end', function() {

            // Data reception is done, do whatever with it!
            var parsed = JSON.parse(body);
            if (!parsed) return;
            msg.channel.sendMessage(msg.author + ", " + parsed.magic.answer);

        });
    });
}
commands.push(cmd);
////////////////////////////////////////////////////////////


module.exports = commands;
