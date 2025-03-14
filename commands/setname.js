module.exports = {
    name: 'setname',
    execute: async (sock, msg, args, owner, config, saveConfig) => {
        if (!args.length) return msg.reply('Provide a name! Example: !setname Ruby {date}');

        let name = args.join(' ').replace('{date}', new Date().toISOString().split('T')[0]);
        config.nameHistory.unshift(name);
        if (config.nameHistory.length > 5) config.nameHistory.pop();
        await saveConfig();
        await msg.reply(`Name update not supported directly. Recorded: ${name}\nHistory: ${config.nameHistory.join(', ')}`);
    }
};
