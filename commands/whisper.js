module.exports = {
    name: 'whisper',
    execute: async (sock, msg, args, owner, config, whisperLimits, saveWhisperLimits) => {
        if (!args.length && !msg.hasQuotedMsg) return msg.reply('Please provide a message or quote an image! Example: !whisper Improve speed');

        const senderNumber = (await msg.getContact()).id.user;
        const isPrivileged = senderNumber === owner || (config.admins.some(a => a.number === senderNumber) && msg.isGroup && (await msg.getChat()).participants.some(p => p.id._serialized.split('@')[0] === senderNumber && p.isAdmin));
        const currentDate = new Date().toISOString().split('T')[0];
        whisperLimits[senderNumber] = whisperLimits[senderNumber] || { date: currentDate, whisperCount: 0, ownerCount: 0, meCount: 0, whisperId: 0, sender: senderNumber };

        if (args[0] === 'reply' && isPrivileged) {
            const whisperId = args[1];
            const replyText = args.slice(2).join(' ');
            const target = Object.values(whisperLimits).find(w => `WSP-${String(w.whisperId).padStart(3, '0')}` === whisperId);
            if (!target) return msg.reply('Whisper ID not found!');
            await sock.sendMessage(`${target.sender}@s.whatsapp.net`, { text: `Reply from owner (${whisperId}): ${replyText}` });
            return msg.reply(`Reply sent to ${target.sender} for ${whisperId}`);
        }

        if (!isPrivileged) {
            if (whisperLimits[senderNumber].date !== currentDate) {
                whisperLimits[senderNumber] = { date: currentDate, whisperCount: 0, ownerCount: 0, meCount: 0, whisperId: whisperLimits[senderNumber].whisperId, sender: senderNumber };
            }
            if (whisperLimits[senderNumber].whisperCount >= 3) return msg.reply('You have reached the daily limit of 3 whispers! Try again tomorrow.');
            whisperLimits[senderNumber].whisperCount += 1;
            whisperLimits[senderNumber].whisperId += 1;
            await saveWhisperLimits();
        }

        const whisperId = `WSP-${String(whisperLimits[senderNumber].whisperId).padStart(3, '0')}`;
        const message = args.join(' ') || 'No text provided';
        let media = null;
        if (msg.hasQuotedMsg) {
            const quoted = await msg.getQuotedMessage();
            if (quoted.hasMedia) media = quoted.message.imageMessage;
        }

        const ownerChatId = `${owner}@s.whatsapp.net`;
        const whisperMessage = `*Whisper ${whisperId} from ${senderNumber}*\n${message}`;
        await sock.sendMessage(ownerChatId, media ? { image: media, caption: whisperMessage } : { text: whisperMessage });
        await msg.reply(`Your suggestion (${whisperId}) has been sent to the bot owner! Owner can reply with !whisper reply ${whisperId} <message>`);
    }
};
