const Discord = require('discord.js');
var logType = require('../../consts/logMessageType');

//Send the type as a string
exports.logMessage = function(type, moderatorUser, targetUser, channel, reason) {
    if (!logType.hasOwnProperty(type.toUpperCase())) {
        //Invalid logging
        return;
    }

    if (!reason) {
        reason = "No reason specified";
    }
    var embed = new Discord.RichEmbed();
    embed.setTitle(type);
    embed.addField("User", `${targetUser.username}#${targetUser.discriminator} (${targetUser.id})`, false);
    embed.addField("Moderator", `${moderatorUser.username}#${moderatorUser.discriminator} (${moderatorUser.id})`, false);
    embed.addField("Reason", `${reason}`, false);
    embed.setTimestamp();
    embed.setColor(logType[type]);
    return channel.send({embed: embed});
}

//Placeholders are only for bans
exports.logPlaceholder = function(targetUser, channel) {
    var embed = new Discord.RichEmbed();
    embed.setTitle("BAN");
    embed.setColor(logType["BAN"]);

    channel.send({embed: embed}).then(m => {
        embed.setTitle("BAN");
        embed.addField("User", `${targetUser.username}#${targetUser.discriminator} (${targetUser.id})`, false);
        embed.addField("Moderator", `${m.id}`, false);
        embed.addField("Reason", `${m.id}`, false);
        embed.setTimestamp();
        return m.edit("", {
            embed: embed
        })
    })
}

exports.editEmbed = function(message, moderatorUser, reason) {

    if (!reason) {
        reason = "No reason specified";
    }

    var rawEmbed = message.embeds[0];
    var embed = new Discord.RichEmbed();
    embed.setTitle(rawEmbed.title);
    embed.setColor(rawEmbed.color);
    var found = false;
    for (var field of rawEmbed.fields) {
        if (field.name == "Reason") {
            embed.addField(field.name, reason, field.inline);
        } else if (field.name == "Moderator") {
            found = true; //TODO dafuq I did here
            if (field.value.includes(message.id)) {
                embed.addField(field.name, `${moderatorUser.username}#${moderatorUser.discriminator} (${moderatorUser.id})`, field.inline);
            }
        } else {
            embed.addField(field.name, field.value, field.inline);
        }
    }
    if (!found) {
        embed.addField("Moderator", `${moderatorUser.username}#${moderatorUser.discriminator} (${moderatorUser.id})`, true)
    }
    embed.setTimestamp(new Date(rawEmbed.createdTimestamp));
    return message.edit("", {
        embed: embed
    });
}
