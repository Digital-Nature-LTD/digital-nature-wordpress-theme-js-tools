import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Loads a config file, supporting JSON or JS modules.
 * @param {string} configPath
 * @returns {Promise<Object>}
 */
async function loadConfig(configPath) {
    const resolvedPath = path.isAbsolute(configPath)
        ? configPath
        : path.resolve(process.cwd(), configPath);
    if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Config file not found: ${resolvedPath}`);
    }
    if (resolvedPath.endsWith('.json')) {
        // Read and parse the JSON file
        const content = await fs.promises.readFile(resolvedPath, 'utf8');
        return JSON.parse(content);
    } else {
        // Fallback for .js/.mjs configs
        const { pathToFileURL } = await import('url');
        const configModule = await import(pathToFileURL(resolvedPath).href);
        return configModule.default || configModule.config || configModule;
    }
}

/**
 * Build Sass and optionally RTL CSS.
 * @param {Object} options
 * @param {boolean} [options.watch=false] - Whether to run in watch mode.
 * @param {Object} [options.config] - Sass config object.
 */
export async function runSassFromConfig({ watch = false, config } = {}) {
    function buildSassArgs(entry, outputStyle, watchFlag) {
        let args = [`"${entry.src}:${entry.dest}"`];
        if (outputStyle) args.push(`--style=${outputStyle}`);
        if (watchFlag) args.push('--watch');
        return args.join(' ').trim();
    }

    function buildSassCommand(conf, watchFlag) {
        const sassCmd = [];
        for (const entry of conf.entries) {
            sassCmd.push(buildSassArgs(entry, conf.outputStyle, watchFlag));
        }
        return `sass ${sassCmd.join(' ')}`;
    }

    try {
        if (!config) throw new Error('No config object provided to runSassFromConfig.');
        const sassCommand = buildSassCommand(config, watch);
        console.log('Running:', sassCommand);
        execSync(sassCommand, { stdio: 'inherit' });

        // In watch mode, skip RTL step since it should only be run after a one-off build
        if (!watch && config.rtl && Array.isArray(config.rtl)) {
            for (const rtlEntry of config.rtl) {
                const rtlCwd = path.resolve(__dirname, '../');
                const rtlCmd = `rtlcss --config .rtlcss.json "${rtlEntry.src}" "${rtlEntry.dest}"`;
                execSync(rtlCmd, { stdio: 'inherit', cwd: rtlCwd });
            }
        }
    } catch (err) {
        console.error('Error running Sass or RTL CSS:', err.message);
        process.exit(1);
    }
}

// --- CLI entrypoint ---
if (
    process.argv[1] &&
    fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
    const isWatch = process.argv.includes('--watch');
    let configPath = null;

    // Parse --config path
    const configIdx = process.argv.indexOf('--config');
    if (configIdx !== -1) {
        configPath = process.argv[configIdx + 1];
        if (!configPath) {
            console.error('Error: --config flag provided but no path specified.');
            process.exit(1);
        }
    }

    (async () => {
        let configObj;
        try {
            if (configPath) {
                configObj = await loadConfig(configPath);
            } else {
                // Default: load ../config/sass.config.json
                configObj = await loadConfig(path.resolve(__dirname, '../config/sass.config.json'));
            }
            await runSassFromConfig({ watch: isWatch, config: configObj });
        } catch (err) {
            console.error('Error loading config:', err.message);
            process.exit(1);
        }
    })();
}