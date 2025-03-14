module.exports = {
    name: 'setbio',
    execute: async (client, msg, args, owner, config, saveConfig) => {
        if (!args.length) return msg.reply('Provide a bio text! Example: !setbio Bot since {date}');

        let bio = args.join(' ').replace('{date}', new Date().toISOString().split('T')[0]);
        config.bioHistory.unshift(bio);
        if (config.bioHistory.length > 5) config.bioHistory.pop();
        await client.setStatus(bio);
        await saveConfig();
        await msg.reply(`Bio updated: ${bio}\nHistory: ${config.bioHistory.join(', ')}`);
    }
};