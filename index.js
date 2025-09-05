import { combineAndMinify } from './tools/combineAndMinify.mjs';
import { downloadRemoteFile } from './tools/downloadRemoteFile.mjs';
import { runSassFromConfig } from './tools/runSassFromConfig.mjs';
// ...etc

export const DigitalNatureTools = {
    runSassFromConfig,
    combineAndMinify,
    downloadRemoteFile,
};

export default DigitalNatureTools;