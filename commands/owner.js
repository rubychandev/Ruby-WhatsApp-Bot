module.exports = {
    name: 'owner',
    execute: async (sock, msg, args, owner, config, whisperLimits, saveWhisperLimits) => {
        const senderNumber = (await msg.getContact()).id.user;
        const isPrivileged = senderNumber === owner || (config.admins.some(a => a.number === senderNumber) && msg.isGroup && (await msg.getChat()).participants.some(p => p.id._serialized.split('@')[0] === senderNumber && p.isAdmin));
        const currentDate = new Date().toISOString().split('T')[0];
        whisperLimits[senderNumber] = whisperLimits[senderNumber] || { date: currentDate, whisperCount: 0, ownerCount: 0, meCount: 0 };

        if (args[0] === 'message' && isPrivileged) {
            config.ownerMessage = args.slice(1).join(' ');
            await saveConfig();
            return msg.reply(`Owner message set to: ${config.ownerMessage}`);
        }

        if (!isPrivileged) {
            if (whisperLimits[senderNumber].date !== currentDate) whisperLimits[senderNumber] = { date: currentDate, whisperCount: 0, ownerCount: 0, meCount: 0 };
            if (whisperLimits[senderNumber].ownerCount >= 3) return msg.reply('You have reached the daily limit of 3 uses for this command! Try again tomorrow.');
            whisperLimits[senderNumber].ownerCount += 1;
            await saveWhisperLimits();
        }

        const presence = msg.ownerPresence ? msg.ownerPresence() : 'unknown';
        const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:Bot Owner\nTEL;TYPE=CELL:${owner}\nEND:VCARD`;
        const message = config.ownerMessage ? `\nMessage: ${config.ownerMessage}` : '';
        await msg.reply(`Here is the bot owner's contact (Status: ${presence})${message}:`, null, { contacts: [{ vcard }] });
    }
};
