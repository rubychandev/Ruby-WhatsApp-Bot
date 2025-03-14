module.exports = {
    name: 'speed',
    execute: async (sock, msg) => {
        const start = performance.now();
        const testMsg = await sock.sendMessage(msg.key.remoteJid, { text: 'Testing...' });
        const apiLatency = performance.now() - start;

        const ioStart = performance.now();
        await fs.promises.writeFile('./test.txt', 'test');
        const ioLatency = performance.now() - ioStart;

        const totalLatency = apiLatency + ioLatency;
        await sock.sendMessage(msg.key.remoteJid, {
            text: `Bot Speed:\n- API Latency: ${apiLatency.toFixed(2)}ms\n- I/O Latency: ${ioLatency.toFixed(2)}ms\n- Total: ${totalLatency.toFixed(2)}ms`,
            quoted: testMsg
        });
    }
};
