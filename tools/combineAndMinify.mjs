import fs from 'fs';
import path from 'path';
import UglifyJS from 'uglify-js';

/**
 * Combines and minifies multiple JavaScript or CSS files.
 * @param {string[]} files - Array of file paths to combine (order matters, all must be .js or all .css).
 * @param {string} outPath - The output file path (minified bundle).
 */
export async function combineAndMinify(files, outPath) {
    if (!files.length) throw new Error('No input files provided.');

    const extensions = files.map(f => path.extname(f).toLowerCase());
    const isJS = extensions.every(ext => ext === '.js');
    const isCSS = extensions.every(ext => ext === '.css');

    if (!isJS && !isCSS) {
        throw new Error('Input files must be all .js or all .css, not a mix.');
    }

    let combinedCode = '';
    for (const file of files) {
        const code = fs.readFileSync(file, 'utf8');
        combinedCode += `\n/* ---- ${path.basename(file)} ---- */\n` + code + '\n';
    }

    let minified;
    if (isJS) {
        const result = UglifyJS.minify(combinedCode);
        if (result.error) throw new Error('UglifyJS error: ' + result.error);
        minified = result.code;
    } else if (isCSS) {
        // Minimal CSS minification: remove comments, whitespace, and newlines
        minified = combinedCode
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
            .replace(/\s{2,}/g, ' ')         // Collapse whitespace
            .replace(/\s*([{}:;,])\s*/g, '$1') // Remove space around CSS symbols
            .replace(/;}/g, '}')              // Remove unnecessary semicolons
            .replace(/\n/g, '');              // Remove newlines
    }

    // Ensure output directory exists
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, minified);
}