module.exports = {
    name: 'me',
    execute: async (client, msg, args, owner, config, whisperLimits, saveWhisperLimits) => {
        const sender = await msg.getContact();
        const senderNumber = sender.id.user;
        const isPrivileged = senderNumber === owner || (config.admins.some(a => a.number === senderNumber) && msg.isGroup && (await msg.getChat()).participants.some(p => p.id._serialized === senderNumber + '@c.us' && p.isAdmin));
        const currentDate = new Date().toISOString().split('T')[0];
        whisperLimits[senderNumber] = whisperLimits[senderNumber] || { date: currentDate, whisperCount: 0, ownerCount: 0, meCount: 0 };

        if (!isPrivileged) {
            if (whisperLimits[senderNumber].date !== currentDate) whisperLimits[senderNumber] = { date: currentDate, whisperCount: 0, ownerCount: 0, meCount: 0 };
            if (whisperLimits[senderNumber].meCount >= 3) return msg.reply('You have reached the daily limit of 3 uses for this command! Try again tomorrow.');
            whisperLimits[senderNumber].meCount += 1;
            await saveWhisperLimits();
        }

        const isGroupAdmin = msg.isGroup && (await msg.getChat()).participants.some(p => p.id._serialized === senderNumber + '@c.us' && p.isAdmin);
        const customName = args.join(' ') || sender.pushname || 'Unknown';
        const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${customName}${msg.isGroup ? ` (${isGroupAdmin ? 'Admin' : 'Member'})` : ''}\nTEL;TYPE=CELL:${senderNumber}\nEND:VCARD`;
        await msg.reply('Here is your contact:', null, { contacts: [{ vcard }] });
    }
};