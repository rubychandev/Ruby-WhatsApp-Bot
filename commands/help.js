module.exports = {
    name: 'help',
    execute: async (sock, msg, args, owner, config) => {
        const senderNumber = (await msg.getContact()).id.user;
        const isOwner = senderNumber === owner;
        const isBotAdmin = config.admins.some(a => a.number === senderNumber);
        const isGroupAdmin = msg.isGroup && (await msg.getChat()).participants.some(p => p.id._serialized.split('@')[0] === senderNumber && p.isAdmin);

        let helpText = `✨ *Ruby Bot v0.1 - Help Menu* ✨\n═══════════════════════\n`;
        let buttons = [];

        if (isOwner) {
            helpText += `*General Commands*\n${config.prefix}whisper <message> - Send suggestion\n${config.prefix}owner - Show owner\n${config.prefix}me [name] - Show your contact\n` +
                        `*Owner & Admin Commands*\n${config.prefix}help - This menu\n${config.prefix}speed - Test speed\n${config.prefix}hidetag [admins/schedule] <text> - Tag members\n${config.prefix}mimic <@target> [keyword] / off - Mimic\n` +
                        `*Owner-Only Commands*\n${config.prefix}addadmin <number> [time] - Add admin\n${config.prefix}removeadmin <number> - Remove admin\n${config.prefix}setprefix <prefix/reset> - Change prefix\n${config.prefix}setpfp - Set PFP\n${config.prefix}setbio <text> - Set bio\n${config.prefix}setname <name> - Set name\n` +
                        `═══════════════════════\n*Note*: Non-admins limited to 3x/day.`;
            buttons = [
                { buttonId: 'general', buttonText: { displayText: 'General Commands' }, type: 1 },
                { buttonId: 'admin', buttonText: { displayText: 'Admin Commands' }, type: 1 },
                { buttonId: 'owner', buttonText: { displayText: 'Owner Commands' }, type: 1 }
            ];
        } else if (isBotAdmin && isGroupAdmin) {
            helpText += `*Available Commands*\n${config.prefix}help - This menu\n${config.prefix}speed - Test speed\n${config.prefix}hidetag [admins/schedule] <text> - Tag members\n${config.prefix}mimic <@target> [keyword] / off - Mimic\n` +
                        `*General Commands*\n${config.prefix}whisper <message> - Send suggestion\n${config.prefix}owner - Show owner\n${config.prefix}me [name] - Show your contact\n` +
                        `═══════════════════════\n*Note*: Owner-only commands restricted.`;
            buttons = [
                { buttonId: 'general', buttonText: { displayText: 'General Commands' }, type: 1 },
                { buttonId: 'admin', buttonText: { displayText: 'Admin Commands' }, type: 1 }
            ];
        } else {
            helpText += `*General Commands*\n${config.prefix}whisper <message> - Send suggestion\n${config.prefix}owner - Show owner\n${config.prefix}me [name] - Show your contact\n` +
                        `═══════════════════════\n*Note*: Limited to 3x/day per command.`;
            buttons = [{ buttonId: 'general', buttonText: { displayText: 'General Commands' }, type: 1 }];
        }

        await sock.sendMessage(msg.key.remoteJid, { text: helpText, buttons, headerType: 1 });
    }
};
