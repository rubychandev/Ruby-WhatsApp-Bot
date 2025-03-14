module.exports = {
    name: 'whisper',
    execute: async (client, msg, args, owner, config, whisperLimits, saveWhisperLimits) => {
        if (!args.length && !msg.hasMedia) return msg.reply('Please provide a message or media! Example: !whisper Improve speed');

        const senderNumber = (await msg.getContact()).id.user;
        const isPrivileged = senderNumber === owner || (config.admins.some(a => a.number === senderNumber) && msg.isGroup && (await msg.getChat()).participants.some(p => p.id._serialized === senderNumber + '@c.us' && p.isAdmin));
        const currentDate = new Date().toISOString().split('T')[0];
        whisperLimits[senderNumber] = whisperLimits[senderNumber] || { date: currentDate, whisperCount: 0, ownerCount: 0, meCount: 0, whisperId: 0 };

        if (!isPrivileged) {
            if (whisperLimits[senderNumber].date !== currentDate) {
                whisperLimits[senderNumber] = { date: currentDate, whisperCount: 0, ownerCount: 0, meCount: 0, whisperId: whisperLimits[senderNumber].whisperId };
            }
            if (whisperLimits[senderNumber].whisperCount >= 3) return msg.reply('You have reached the daily limit of 3 whispers! Try again tomorrow.');
            whisperLimits[senderNumber].whisperCount += 1;
            whisperLimits[senderNumber].whisperId += 1;
            await saveWhisperLimits();
        }

        const whisperId = `WSP-${String(whisperLimits[senderNumber].whisperId).padStart(3, '0')}`;
        const message = args.join(' ') || 'No text provided';
        let media = null;
        if (msg.hasMedia) media = await msg.downloadMedia();

        const ownerChatId = `${owner}@c.us`;
        const whisperMessage = `*Whisper ${whisperId} from ${senderNumber}*\n${message}`;
        await client.sendMessage(ownerChatId, whisperMessage, media ? { media } : {});
        await msg.reply(`Your suggestion (${whisperId}) has been sent to the bot owner!`);
    }
};