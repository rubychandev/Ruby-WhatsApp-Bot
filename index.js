const { Boom } = require('@hapi/boom');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@adiwajshing/baileys');
const pino = require('pino');
const fs = require('fs').promises;
const readline = require('readline');
const Logger = require('./utils/logger');

const logger = new Logger(); // Logger kustom untuk logging manual
const configPath = './config.json';
const whisperLimitsPath = './whisper-limits.json';
const adminLogsPath = './admin-logs.json';
let config = { owner: '', botNumber: '', admins: [], prefix: '!', mimicTargets: [], bioHistory: [], nameHistory: [], ownerMessage: '' };
let whisperLimits = {};
let adminLogs = [];
const commands = new Map();
let isReady = false;

const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

const loadConfig = async () => {
    try {
        config = JSON.parse(await fs.readFile(configPath, 'utf8')) || {};
        config.owner = config.owner || '';
        config.botNumber = config.botNumber || '';
        config.admins = config.admins || [];
        config.prefix = config.prefix || '!';
        config.mimicTargets = config.mimicTargets || [];
        config.bioHistory = config.bioHistory || [];
        config.nameHistory = config.nameHistory || [];
        config.ownerMessage = config.ownerMessage || '';
    } catch {
        config = { owner: '', botNumber: '', admins: [], prefix: '!', mimicTargets: [], bioHistory: [], nameHistory: [], ownerMessage: '' };
        await saveConfigImmediate();
    }
};

const loadWhisperLimits = async () => {
    try {
        whisperLimits = JSON.parse(await fs.readFile(whisperLimitsPath, 'utf8')) || {};
    } catch {
        whisperLimits = {};
        await saveWhisperLimitsImmediate();
    }
};

const loadAdminLogs = async () => {
    try {
        adminLogs = JSON.parse(await fs.readFile(adminLogsPath, 'utf8')) || [];
    } catch {
        adminLogs = [];
        await saveAdminLogsImmediate();
    }
};

const saveConfigImmediate = async () => fs.writeFile(configPath, JSON.stringify(config, null, 2));
const saveWhisperLimitsImmediate = async () => fs.writeFile(whisperLimitsPath, JSON.stringify(whisperLimits, null, 2));
const saveAdminLogsImmediate = async () => fs.writeFile(adminLogsPath, JSON.stringify(adminLogs, null, 2));
const saveConfig = debounce(saveConfigImmediate, 100);
const saveWhisperLimits = debounce(saveWhisperLimitsImmediate, 100);
const saveAdminLogs = debounce(saveAdminLogsImmediate, 100);

const loadCommands = async () => {
    const files = (await fs.readdir('./commands')).filter(f => f.endsWith('.js'));
    await Promise.all(files.map(file => import(`./commands/${file}`).then(m => commands.set(m.default.name, m.default))));
    logger.info(`Loaded ${commands.size} commands`);
};

const connectToWhatsApp = async () => {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }) // Gunakan Pino dengan level silent untuk kecepatan
    });

    sock.ev.on('creds.update', saveCreds);

    let ownerPresence = 'unavailable';
    sock.ev.on('presence.update', (update) => {
        if (update.id === `${config.owner}@s.whatsapp.net`) {
            ownerPresence = update.presences[config.owner + '@s.whatsapp.net'].lastKnownPresence || 'unavailable';
        }
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (connection === 'open') {
            isReady = true;
            logger.info('Bot is ready!');
        } else if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            logger.error('Disconnected:', lastDisconnect?.error);
            if (shouldReconnect) connectToWhatsApp();
        } else if (qr) {
            const pairingCode = await sock.requestPairingCode(config.botNumber);
            logger.info(`Pairing code for ${config.botNumber}: ${pairingCode}`);
            console.log(`Open WhatsApp on your phone, go to Settings > Linked Devices > Link with Phone Number, and enter this code: ${pairingCode}`);
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || !isReady || msg.key.fromMe) return;

        const senderNumber = msg.key.remoteJid.split('@')[0];
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const isGroup = msg.key.remoteJid.endsWith('@g.us');
        const chat = isGroup ? await sock.groupMetadata(msg.key.remoteJid) : null;

        const mimicTarget = config.mimicTargets.find(t => t.id === senderNumber + '@s.whatsapp.net');
        if (mimicTarget && !body.startsWith(config.prefix)) {
            if (!mimicTarget.keyword || body.includes(mimicTarget.keyword)) {
                await sock.sendMessage(msg.key.remoteJid, { text: body });
                return;
            }
            return;
        }

        if (!body.startsWith(config.prefix)) return;

        const [commandName, ...args] = body.slice(config.prefix.length).trim().split(/ +/);
        const command = commands.get(commandName.toLowerCase());
        if (!command) return;

        const isOwner = senderNumber === config.owner;
        const isBotAdmin = config.admins.some(a => a.number === senderNumber);
        const isGroupAdmin = isGroup && chat?.participants.some(p => p.id.split('@')[0] === senderNumber && p.admin);

        const wrappedMsg = {
            key: msg.key,
            message: msg.message,
            from: msg.key.remoteJid,
            body,
            isGroup,
            getContact: async () => ({ id: { user: senderNumber }, pushname: senderNumber }),
            getChat: async () => ({
                participants: chat ? chat.participants.map(p => ({ id: { _serialized: p.id }, isAdmin: p.admin })) : [],
                sendMessage: async (text, options) => sock.sendMessage(msg.key.remoteJid, { text, ...options })
            }),
            reply: async (text, _, options) => sock.sendMessage(msg.key.remoteJid, { text, ...options }),
            getMentions: async () => (msg.message.extendedTextMessage?.contextInfo?.mentionedJid || []).map(id => ({ id: { _serialized: id } })),
            hasQuotedMsg: !!msg.message.extendedTextMessage?.contextInfo?.quotedMessage,
            getQuotedMessage: async () => ({
                hasMedia: !!msg.message.imageMessage,
                type: msg.message.imageMessage ? 'image' : 'text',
                message: msg.message,
                downloadMedia: async () => msg.message.imageMessage ? { data: Buffer.from(msg.message.imageMessage.data).toString('base64') } : null
            }),
            ownerPresence: () => ownerPresence
        };

        if (['whisper', 'owner', 'me'].includes(commandName)) {
            try {
                await command.execute(sock, wrappedMsg, args, config.owner, config, whisperLimits, saveWhisperLimits);
            } catch (error) {
                logger.error(`Error executing ${commandName}: ${error.message}`);
                await sock.sendMessage(msg.key.remoteJid, { text: 'An error occurred!' });
            }
            return;
        }

        if (!isOwner && !(isBotAdmin && isGroupAdmin)) {
            return sock.sendMessage(msg.key.remoteJid, { text: 'Only the bot owner or bot admins who are also group admins can use this bot!' });
        }

        if (!isOwner && ['addadmin', 'removeadmin', 'setprefix', 'setpfp', 'setbio', 'setname'].includes(commandName)) {
            return sock.sendMessage(msg.key.remoteJid, { text: 'Only the bot owner can use this command!' });
        }

        try {
            if (isBotAdmin || isGroupAdmin) {
                adminLogs.push({ admin: senderNumber, command: commandName, args, timestamp: new Date().toISOString() });
                await saveAdminLogs();
            }
            await command.execute(sock, wrappedMsg, args, config.owner, config, saveConfig);
        } catch (error) {
            logger.error(`Error executing ${commandName}: ${error.message}`);
            await sock.sendMessage(msg.key.remoteJid, { text: 'An error occurred!' });
        }
    });

    return sock;
};

(async () => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const getOwnerNumber = () => new Promise(resolve => {
        if (config.owner) return resolve(config.owner);
        rl.question('Enter owner number (e.g., 6281234567890): ', async answer => {
            config.owner = answer;
            await saveConfigImmediate();
            resolve(answer);
        });
    });
    const getBotNumber = () => new Promise(resolve => {
        if (config.botNumber) return resolve(config.botNumber);
        rl.question('Enter bot number (e.g., 6289876543210): ', async answer => {
            config.botNumber = answer;
            await saveConfigImmediate();
            resolve(answer);
        });
    });

    try {
        await Promise.all([loadConfig(), loadWhisperLimits(), loadAdminLogs()]);
        await getOwnerNumber();
        await getBotNumber();
        await loadCommands();
        await connectToWhatsApp();
    } catch (error) {
        logger.error(`Startup error: ${error.message}`);
        process.exit(1);
    }
})();
