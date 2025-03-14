module.exports = {
    name: 'help',
    execute: async (client, msg, args, owner, config) => {
        const vcard = 'BEGIN:VCARD\nVERSION:3.0\nFN:Ruby Bot v0.1\nTEL;TYPE=CELL:\nEND:VCARD';
        const senderNumber = (await msg.getContact()).id.user;
        const isOwner = senderNumber === owner;
        const isBotAdmin = config.admins.some(a => a.number === senderNumber);
        const isGroupAdmin = msg.isGroup && (await msg.getChat()).participants.some(p => p.id._serialized === senderNumber + '@c.us' && p.isAdmin);

        const page = args[0] ? parseInt(args[0]) : 1;
        let helpText;

        if (isOwner) {
            if (page === 1) {
                helpText = `✨ *Ruby Bot v0.1 - Help Menu (Page 1/2)* ✨\n` +
                           `═══════════════════════\n` +
                           `*Commands for Owner & Admins*\n` +
                           `${config.prefix}help [page] - Show this menu\n` +
                           `${config.prefix}speed - Test bot speed\n` +
                           `${config.prefix}hidetag [admins/schedule <time>] <text> - Tag group members\n` +
                           `${config.prefix}mimic <@target> [keyword=<word>] / off - Mimic messages\n` +
                           `───────────────────────\n` +
                           `*General Commands*\n` +
                           `${config.prefix}whisper <message> - Send suggestion (with media)\n` +
                           `${config.prefix}owner - Show owner contact\n` +
                           `${config.prefix}me [name] - Show your contact\n` +
                           `═══════════════════════\n` +
                           `*Note*: Use ${config.prefix}help 2 for owner-only commands.`;
            } else {
                helpText = `✨ *Ruby Bot v0.1 - Help Menu (Page 2/2)* ✨\n` +
                           `═══════════════════════\n` +
                           `*Owner-Only Commands*\n` +
                           `${config.prefix}addadmin <number> [time] - Add bot admin\n` +
                           `${config.prefix}removeadmin <number> - Remove bot admin\n` +
                           `${config.prefix}setprefix <new_prefix/reset> - Change bot prefix\n` +
                           `${config.prefix}setpfp - Change profile picture (reply to HD image)\n` +
                           `${config.prefix}setbio <text> - Change bot bio\n` +
                           `${config.prefix}setname <name> - Change bot name\n` +
                           `═══════════════════════\n` +
                           `*Note*: Non-admins limited to 3x/day for general commands.`;
            }
        } else if (isBotAdmin && isGroupAdmin) {
            helpText = `✨ *Ruby Bot v0.1 - Help Menu* ✨\n` +
                       `═══════════════════════\n` +
                       `*Available Commands*\n` +
                       `${config.prefix}help - Show this menu\n` +
                       `${config.prefix}speed - Test bot speed\n` +
                       `${config.prefix}hidetag [admins/schedule <time>] <text> - Tag group members\n` +
                       `${config.prefix}mimic <@target> [keyword=<word>] / off - Mimic messages\n` +
                       `───────────────────────\n` +
                       `*General Commands*\n` +
                       `${config.prefix}whisper <message> - Send suggestion (with media)\n` +
                       `${config.prefix}owner - Show owner contact\n` +
                       `${config.prefix}me [name] - Show your contact\n` +
                       `═══════════════════════\n` +
                       `*Note*: Owner-only commands restricted.`;
        } else {
            helpText = `✨ *Ruby Bot v0.1 - Help Menu* ✨\n` +
                       `═══════════════════════\n` +
                       `*General Commands*\n` +
                       `${config.prefix}whisper <message> - Send suggestion (with media)\n` +
                       `${config.prefix}owner - Show owner contact\n` +
                       `${config.prefix}me [name] - Show your contact\n` +
                       `═══════════════════════\n` +
                       `*Note*: Limited to 3x/day per command.`;
        }

        await msg.reply(helpText, null, { contacts: [{ vcard }] });
    }
};