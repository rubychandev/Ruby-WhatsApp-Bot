const { MessageMedia } = require('whatsapp-web.js');
const sizeOf = require('image-size');

module.exports = {
    name: 'setpfp',
    execute: async (client, msg, args, owner, config, saveConfig) => {
        if (!msg.hasQuotedMsg) return msg.reply('Reply to an HD image (minimum 512x512 pixels)!');

        const quotedMsg = await msg.getQuotedMessage();
        if (!quotedMsg.hasMedia || quotedMsg.type !== 'image') return msg.reply('The replied message must be an image!');

        const media = await quotedMsg.downloadMedia();
        const buffer = Buffer.from(media.data, 'base64');
        const { width, height } = sizeOf(buffer);
        if (width < 512 || height < 512) return msg.reply('Image must be HD (minimum 512x512 pixels)!');

        const previewMsg = await msg.reply('Preview of new profile picture:', null, { media });
        await msg.reply('Reply "yes" to confirm or "no" to cancel.');
        const response = await new Promise(resolve => client.once('message', m => m.from === msg.from && resolve(m.body.toLowerCase())));
        if (response !== 'yes') return msg.reply('Profile picture update canceled.');

        await client.setProfilePicture(media);
        await msg.reply('Profile picture updated successfully!');
    }
};