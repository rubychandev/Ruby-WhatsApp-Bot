module.exports = {
    name: 'addadmin',
    execute: async (sock, msg, args, owner, config, saveConfig) => {
        if (!args[0]) return msg.reply('Enter a number! Example: !addadmin 6281234567890 [24h]');

        const number = args[0].replace(/[^0-9]/g, '');
        if (!number.startsWith('62')) return msg.reply('Use Indonesian number format (e.g., 6281234567890)!');
        if (config.owner === number || config.admins.some(a => a.number === number)) return msg.reply('This number is already an admin/owner!');

        const time = args[1]?.match(/^(\d+)([smh])$/);
        const expiry = time ? Date.now() + { s: 1000, m: 60000, h: 3600000 }[time[2]] * time[1] : null;
        config.admins.push({ number, expiry });
        await saveConfig();
        await msg.reply(`Added ${number} as bot admin${expiry ? ` (expires in ${args[1]})` : ''}!`);
    }
};
