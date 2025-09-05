import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs';

/**
 * Loads a config file, supporting JSON or JS modules.
 * @param {string} configPath
 * @returns {Promise<Object>}
 */
export async function loadConfig(configPath) {
    const resolvedPath = path.isAbsolute(configPath)
        ? configPath
        : path.resolve(process.cwd(), configPath);
    if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Config file not found: ${resolvedPath}`);
    }
    if (resolvedPath.endsWith('.json')) {
        const content = await fs.promises.readFile(resolvedPath, 'utf8');
        return JSON.parse(content);
    } else {
        const configModule = await import(pathToFileURL(resolvedPath).href);
        return configModule.default || configModule.config || configModule;
    }
}

/**
 * Accepts either an options object or a CLI args array.
 * - If passed an object, uses it directly (programmatic use)
 * - If passed an array, parses it as CLI arguments (CLI use)
 * @param {Object|Array} optionsOrArgs
 */
export async function runSassFromConfig(optionsOrArgs = {}) {
    let opts = {};

    // If called from CLI, optionsOrArgs will be an Array (from process.argv)
    if (Array.isArray(optionsOrArgs)) {
        // Parse CLI args: --key value --> { key: value }, flags like --watch
        opts = {};
        for (let i = 0; i < optionsOrArgs.length; i++) {
            const arg = optionsOrArgs[i];
            if (arg.startsWith('--')) {
                const key = arg.replace(/^--/, '');
                // If next arg exists and does not start with --, treat as value
                if (optionsOrArgs[i + 1] && !optionsOrArgs[i + 1].startsWith('--')) {
                    opts[key] = optionsOrArgs[i + 1];
                    i++; // skip value on next loop
                } else {
                    // Boolean flag
                    opts[key] = true;
                }
            }
        }
    } else {
        opts = optionsOrArgs || {};
    }

    const isWatch = !!opts.watch;
    let configObj;

    try {
        if (opts.config) {
            configObj = await loadConfig(opts.config);
        } else {
            // Default config path: always relative to where the command was run!
            configObj = await loadConfig(path.resolve(process.cwd(), 'config/sass.config.json'));
        }
    } catch (err) {
        console.error('Error loading config:', err.message);
        process.exit(1);
    }

    await runSass({ watch: isWatch, config: configObj });
}

/**
 * Internal: Build Sass and optionally RTL CSS.
 */
async function runSass({ watch = false, config }) {
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
        if (!config) throw new Error('No config object provided to runSass.');
        const sassCommand = buildSassCommand(config, watch);
        console.log('Running:', sassCommand);
        execSync(sassCommand, { stdio: 'inherit' });

        if (!watch && config.rtl && Array.isArray(config.rtl)) {
            for (const rtlEntry of config.rtl) {
                // rtlcss should also be run from process.cwd()
                const rtlCwd = process.cwd();
                const rtlCmd = `rtlcss --config .rtlcss.json "${rtlEntry.src}" "${rtlEntry.dest}"`;
                execSync(rtlCmd, { stdio: 'inherit', cwd: rtlCwd });
            }
        }
    } catch (err) {
        console.error('Error running Sass or RTL CSS:', err.message);
        process.exit(1);
    }
}