module.exports = {
    name: 'removeadmin',
    execute: async (sock, msg, args, owner, config, saveConfig) => {
        if (!args[0]) return msg.reply('Enter an admin number! Example: !removeadmin 6281234567890');

        const number = args[0].replace(/[^0-9]/g, '');
        if (config.owner === number) return msg.reply('The bot owner cannot be removed!');
        const adminIndex = config.admins.findIndex(a => a.number === number);
        if (adminIndex === -1) return msg.reply('This number is not a bot admin!');

        config.admins.splice(adminIndex, 1);
        await saveConfig();
        await msg.reply(`Removed ${number} from bot admins!`);
    }
};
