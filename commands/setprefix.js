module.exports = {
    name: 'setprefix',
    execute: async (client, msg, args, owner, config, saveConfig) => {
        if (!args[0]) return msg.reply('Provide a new prefix or "reset"! Example: !setprefix #');

        if (args[0].toLowerCase() === 'reset') {
            config.prefix = '!';
            await saveConfig();
            return msg.reply('Prefix reset to default: !');
        }

        if (args[0].length > 1) return msg.reply('Prefix must be a single character!');
        config.prefix = args[0];
        await saveConfig();
        await msg.reply(`Bot prefix changed to: ${args[0]}`);
    }
};