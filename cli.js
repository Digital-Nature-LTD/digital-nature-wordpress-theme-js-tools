// cli.js
import { DigitalNatureTools } from './index.js';

const [,, tool, ...args] = process.argv;

async function main() {
    if (!tool || !(tool in DigitalNatureTools)) {
        console.log(process.argv);
        console.error(`Usage: node cli.js [tool] [args...]\nAvailable tools: ${Object.keys(DigitalNatureTools).join(', ')}`);
        process.exit(1);
    }
    // Example: node cli.js runSassFromConfig --config myconfig.json
    await DigitalNatureTools[tool](parseArgs(args));
}

function parseArgs(args) {
    // Very basic: --key value --> { key: value }
    const out = {};
    for (let i = 0; i < args.length; i += 2) {
        if (args[i].startsWith('--')) out[args[i].replace(/^--/, '')] = args[i + 1];
    }
    return out;
}

main();