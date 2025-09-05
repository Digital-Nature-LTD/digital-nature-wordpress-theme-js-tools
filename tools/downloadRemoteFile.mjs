import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

/**
 * Downloads a file from a URL to a destination directory, preserving the original filename.
 * Follows redirects up to MAX_REDIRECTS times.
 *
 * @param {string} url - The URL to download.
 * @param {string} destDir - The destination directory.
 * @param {number} [redirects=0] - Internal use for tracking redirect count.
 * @returns {Promise<string>} The full path of the downloaded file.
 */
export async function downloadRemoteFile(url, destDir, redirects = 0) {
    const MAX_REDIRECTS = 10;
    if (redirects > MAX_REDIRECTS) {
        throw new Error(`Too many redirects for ${url}`);
    }
    // Get the filename from the URL (before any query string)
    const fileName = path.basename(url.split('?')[0]);
    const destPath = path.join(destDir, fileName);

    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    const client = url.startsWith('https') ? https : http;
    return new Promise((resolve, reject) => {
        client.get(url, res => {
            // Handle redirect
            if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
                const redirectUrl = res.headers.location;
                if (!redirectUrl) {
                    reject(new Error(`Redirect with no location for ${url}`));
                    return;
                }
                const newUrl = new URL(redirectUrl, url).toString();
                downloadRemoteFile(newUrl, destDir, redirects + 1).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${res.statusCode})`));
                return;
            }
            const fileStream = fs.createWriteStream(destPath);
            res.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close(() => resolve(destPath));
            });
            fileStream.on('error', reject);
        }).on('error', reject);
    });
}