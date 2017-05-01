var dbUtils = require('./db/dbUtils');
var dbGuild = require('./db/dbGuild');
var discordUtils = require('./utils/discordUtils');

var memberRemovalTimer;
var client;

module.exports = function(cli) {
    if (memberRemovalTimer) {
        clearInterval(memberRemovalTimer);
    }
    client = cli;
    memberRemoval();
    memberRemovalTimer = setInterval(memberRemoval, 24 * 3600000);
}

function memberRemoval() {
    client.guilds.forEach((guild) => {
        //Fetch all the members of the guild
        guild.fetchMembers().then(guild => {
            dbGuild.fetchGuild(guild.id, (err, guildData) => {
                if (err) return console.log(err);
                if (guildData && guildData.hasOwnProperty('automember') && guildData.automember) {
                    //Array of all the users we want to remove
                    var memberRoleID;
                    if (guildData && guildData.hasOwnProperty('member')) {
                        memberRoleID = guildData.member;
                    }
                    var membersToUpdate = [];

                    checkUsers(guild.members.array(), (err) => {
                        if (err) console.log(err);

                        updateUserRoles(membersToUpdate, guild, memberRoleID);
                    });

                    function checkUsers(members, callback) {
                        if (members.length <= 0) return callback(null);

                        //Member we are going to check
                        var member = members.pop();
                        //Check if the member has the member role or is trusted, otherwise skip
                        if (!member.roles.has(memberRoleID)) {
                            return checkUsers(members, callback);
                        }

                        dbUtils.fetchUserActivity(guild.id, member.user.id, 14, (err, res) => {
                            if (err) return callback(err);
                            var totalMsgs = 0;
                            for (var day of res) {
                                totalMsgs += day.msgs;
                            }
                            if (totalMsgs < 50) {
                                //console.log(`${member.user.username} added`);
                                membersToUpdate.push(member);
                            }
                            return checkUsers(members, callback);
                        });
                    }
                }
            });
        });
    });
}

function updateUserRoles(membersToUpdate, guild, memberRoleID) {
    if (membersToUpdate.length < 1) return;

    //Avoid ratelimits
    var member = membersToUpdate.pop();
    //Find the color role (if any) and the member role
    var roles = []
    var colorRole = member.roles.find(r => r.name.startsWith("#"));
    if (colorRole) roles.push(colorRole);
    var memberRole;
	if(memberRoleID){
		memberRole = member.roles.get(memberRoleID);
	} else {
		memberRole = member.roles.find(r => r.name.toLowerCase() == "member");
	}
    roles.push(memberRole);

    member.removeRoles(roles).then(() => {
        setTimeout(() => {
            //Add the role
            var roleToAdd = guild.roles.find(r => r.name.toLowerCase() == "lurker");

            member.addRole(roleToAdd).then(() => {
                setTimeout(() => {
                    //Send message and proceed to next member
                    var channel = discordUtils.findActivityChannel(guild);
                    if (!channel) return updateUserRoles(membersToUpdate, guild, memberRoleID);
                    channel.send(`${member.user.username} is now a lurker.`).then(() => {
                        return updateUserRoles(membersToUpdate, guild, memberRoleID);
                    }).catch(console.log);
                }, 1000);
            }).catch(console.log);
        }, 1000);
    }).catch(console.log);
}
