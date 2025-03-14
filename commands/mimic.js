module.exports = {
    name: 'mimic',
    execute: async (client, msg, args, owner, config, saveConfig) => {
        if (!args.length) return msg.reply('Please tag a target or use "off"! Example: !mimic @6281234567890 [keyword=word]');

        if (args[0].toLowerCase() === 'off') {
            if (!config.mimicTargets.length) return msg.reply('Mimic is already off!');
            config.mimicTargets = [];
            await saveConfig();
            return msg.reply('Mimic turned off!');
        }

        const mentions = await msg.getMentions();
        if (!mentions.length) return msg.reply('Please tag a user to mimic! Example: !mimic @6281234567890');

        const keywordArg = args.find(a => a.startsWith('keyword='));
        const keyword = keywordArg ? keywordArg.split('=')[1] : null;
        const target = mentions[0].id._serialized;
        config.mimicTargets.push({ id: target, keyword });
        await saveConfig();
        await msg.reply(`Now mimicking ${mentions[0].id.user}${keyword ? ` (keyword: ${keyword})` : ''}! Use ${config.prefix}mimic off to stop.`);
    }
};