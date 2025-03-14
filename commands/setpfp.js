const sharp = require('sharp');

module.exports = {
    name: 'setpfp',
    execute: async (sock, msg) => {
        if (!msg.hasQuotedMsg) return msg.reply('Reply to an image to set as profile picture!');

        const quoted = await msg.getQuotedMessage();
        if (!quoted.hasMedia || !quoted.message.imageMessage) return msg.reply('The replied message must be an image!');

        const media = quoted.message.imageMessage;
        const buffer = Buffer.from(media.data, 'base64'); // Baileys sudah menyediakan data base64
        const { width, height } = await sharp(buffer).metadata();
        if (width < 512 || height < 512) return msg.reply('Image must be at least 512x512 pixels!');

        await sock.sendMessage(`${config.owner}@s.whatsapp.net`, { image: media, caption: 'Please set this as bot profile picture manually via WhatsApp settings.' });
        await msg.reply('Image sent to owner for manual profile picture update.');
    }
};
