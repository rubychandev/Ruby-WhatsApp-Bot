module.exports = {
    name: 'hidetag',
    execute: async (sock, msg, args) => {
        if (!msg.isGroup) return msg.reply('This command is only for groups!');

        const chat = await msg.getChat();
        let mentions = chat.participants.map(p => p.id._serialized);
        let text = args.join(' ');

        if (args[0] === 'admins') {
            mentions = chat.participants.filter(p => p.isAdmin).map(p => p.id._serialized);
            text = args.slice(1).join(' ');
        } else if (args[0] === 'schedule') {
            const time = args[1]?.match(/^(\d+)([smh])$/);
            if (!time) return msg.reply('Invalid time format! Example: !hidetag schedule 10m Message');
            const [_, value, unit] = time;
            const ms = { s: 1000, m: 60000, h: 3600000 }[unit] * value;
            text = args.slice(2).join(' ');
            setTimeout(() => sock.sendMessage(msg.key.remoteJid, { text: text || 'Hello everyone!', mentions }), ms);
            return msg.reply(`Scheduled hidetag in ${value}${unit}!`);
        }

        await sock.sendMessage(msg.key.remoteJid, { text: text || 'Hello everyone!', mentions });
    }
};
