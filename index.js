const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs').promises;
const readline = require('readline');
const Logger = require('./utils/logger');

const logger = new Logger();
const configPath = './config.json';
const whisperLimitsPath = './whisper-limits.json';
const adminLogsPath = './admin-logs.json';
let config = { owner: '', admins: [], prefix: '!', mimicTargets: [], bioHistory: [], nameHistory: [] };
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
        config = JSON.parse(await fs.readFile(configPath, 'utf8'));
        config.admins = config.admins || [];
        config.prefix = config.prefix || '!';
        config.mimicTargets = config.mimicTargets || [];
        config.bioHistory = config.bioHistory || [];
        config.nameHistory = config.nameHistory || [];
    } catch {
        config = { owner: '', admins: [], prefix: '!', mimicTargets: [], bioHistory: [], nameHistory: [] };
        await saveConfigImmediate();
    }
};

const loadWhisperLimits = async () => {
    try {
        whisperLimits = JSON.parse(await fs.readFile(whisperLimitsPath, 'utf8'));
    } catch {
        whisperLimits = {};
        await saveWhisperLimitsImmediate();
    }
};

const loadAdminLogs = async () => {
    try {
        adminLogs = JSON.parse(await fs.readFile(adminLogsPath, 'utf8'));
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

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        executablePath: process.env.CHROME_PATH || '/usr/bin/chromium-browser'
    },
    webVersionCache: { type: 'remote', remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html' }
});

const loadCommands = async () => {
    const files = (await fs.readdir('./commands')).filter(f => f.endsWith('.js'));
    await Promise.all(files.map(f => import(`./commands/${f}`).then(m => commands.set(m.default.name, m.default))));
    logger.info(`Loaded ${commands.size} commands`);
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

    try {
        await Promise.all([loadConfig(), loadWhisperLimits(), loadAdminLogs()]);
        const owner = await getOwnerNumber();
        await loadCommands();

        client.on('ready', () => {
            isReady = true;
            logger.info('Bot is ready!');
        });

        client.on('message', async msg => {
            if (!isReady || !msg.body) return;

            const mimicTarget = config.mimicTargets.find(t => t.id === msg.from);
            if (mimicTarget && !msg.body.startsWith(config.prefix)) {
                if (!mimicTarget.keyword || msg.body.includes(mimicTarget.keyword)) {
                    return msg.reply(msg.body);
                }
                return;
            }

            if (!msg.body.startsWith(config.prefix)) return;

            const [commandName, ...args] = msg.body.slice(config.prefix.length).trim().split(/ +/);
            const command = commands.get(commandName.toLowerCase());
            if (!command) return;

            const sender = await msg.getContact();
            const senderNumber = sender.id.user;
            const isOwner = senderNumber === owner;
            const isBotAdmin = config.admins.some(a => a.number === senderNumber);
            const isGroupAdmin = msg.isGroup && (await msg.getChat()).participants.some(p => p.id._serialized === sender.id._serialized && p.isAdmin);

            if (['whisper', 'owner', 'me'].includes(commandName)) {
                try {
                    await command.execute(client, msg, args, owner, config, whisperLimits, saveWhisperLimits);
                } catch (error) {
                    logger.error(`Error executing ${commandName}: ${error.message}`);
                    await msg.reply('An error occurred!');
                }
                return;
            }

            if (!isOwner && !(isBotAdmin && isGroupAdmin)) {
                return msg.reply('Only the bot owner or bot admins who are also group admins can use this bot!');
            }

            if (!isOwner && ['addadmin', 'removeadmin', 'setprefix', 'setpfp', 'setbio', 'setname'].includes(commandName)) {
                return msg.reply('Only the bot owner can use this command!');
            }

            try {
                if (isBotAdmin || isGroupAdmin) {
                    adminLogs.push({ admin: senderNumber, command: commandName, args, timestamp: new Date().toISOString() });
                    await saveAdminLogs();
                }
                await command.execute(client, msg, args, owner, config, saveConfig);
            } catch (error) {
                logger.error(`Error executing ${commandName}: ${error.message}`);
                await msg.reply('An error occurred!');
            }
        });

        await client.initialize();
    } catch (error) {
        logger.error(`Startup error: ${error.message}`);
        process.exit(1);
    }
})();