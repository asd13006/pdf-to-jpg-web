const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const srcPath = path.join(__dirname, 'index.html');
const distDir = path.join(__dirname, 'dist');
const distPath = path.join(distDir, 'index.html');

const html = fs.readFileSync(srcPath, 'utf8');

// Match all inline <script> blocks (without src attribute)
const scriptRegex = /<script\s*>(.*?)<\/script>/gs;
const matches = [...html.matchAll(scriptRegex)];

if (matches.length < 2) {
    console.error('Error: Expected at least 2 inline <script> blocks, found', matches.length);
    process.exit(1);
}

// Find the longest script block (the main app code)
let mainMatch = matches[0];
for (const m of matches) {
    if (m[1].length > mainMatch[1].length) {
        mainMatch = m;
    }
}

const mainScriptContent = mainMatch[1];
const mainScriptFull = mainMatch[0];

console.log(`Main script block: ${mainScriptContent.length} chars`);

// Names that MUST survive obfuscation — they are referenced from HTML
// onclick/onchange handlers or are CDN library globals
const reservedNames = [
    // window.* functions called from HTML onclick/onchange
    'openFeatureGrid', 'closeFeatureGrid',
    'toggleTheme', 'changeLanguage',
    'openCloudModal', 'openModal',
    'clearSignature',
    'moveFileItem',
    'toggleSplitMode',
    'saveMetadata',
    'resetReorder',
    'startConversion',
    'removeFile',
    'moveReorderPageBtn', 'deleteReorderPageBtn',
    'toggleWatermarkSettings', 'togglePageNumberSettings', 'toggleSignatureSettings',
    'handleFilesSelected',
    'selectMode',
    'resetApp',
    // action functions registered in FEATURE_MODES
    'startImageToPDF', 'startMerge', 'startSplit', 'startExtractText',
    'startRotate', 'showPDFInfo', 'startCompress', 'startEncrypt',
    'startReorder', 'startPDF2Word', 'saveReorder',
    // CDN libraries attached to window
    'pdfjsLib', 'JSZip', 'PDFLib', 'docx',
    // Core globals accessed across the app
    'FEATURE_MODES', 'currentMode', 'selectedFiles', 'finalZipBlob',
    'translations', 'currentLang', 'isProcessing', 'modalContents',
    // Event handler function expressions assigned dynamically
    'initSignaturePad', 'getSigPos', 'parsePageRange',
    'getValidExtensions', 'handleNewFiles', 'getAcceptForMode',
    'updateUIState', 'renderFileList', 'loadFileThumbnails',
    'triggerDownload', 'readFileAsArrayBuffer', 'setButtonSuccess',
    'renderReorderThumbnails',
    'reorderDragStart', 'reorderDragOver', 'reorderDragLeave',
    'reorderDrop', 'reorderDragEnd',
    'refreshReorderIndices', 'getReorderIndex',
    // yield helper
    'yieldThread',
];

const obfuscationResult = JavaScriptObfuscator.obfuscate(mainScriptContent, {
    // Make strings unreadable by extracting into a rotating base64-encoded array
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.5,

    // Control flow flattening — makes logic very hard to follow
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.5,

    // Inject dead code to confuse readers
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.3,

    // Anti-beautifier: breaks code if someone tries to format it
    selfDefending: false,

    // Compact output (single line)
    compact: true,

    // Simplify expressions
    simplify: true,

    // MUST preserve global variable names (window scope)
    renameGlobals: false,

    // MUST preserve object property names (FEATURE_MODES.settingsPanel etc.)
    renameProperties: false,

    // MUST preserve these specific identifiers
    reservedNames: reservedNames,

    // Disable debug protection (would interfere with dev tools)
    debugProtection: false,

    // Disable domain lock — the app can run anywhere
    domainLock: [],

    // Disable unicode escaping (keeps output smaller)
    unicodeEscapeSequence: false,

    // Don't split strings (performance)
    splitStrings: false,
});

const obfuscatedCode = obfuscationResult.getObfuscatedCode();
console.log(`Obfuscated code: ${obfuscatedCode.length} chars (${Math.round(obfuscatedCode.length / mainScriptContent.length * 100)}% of original)`);

// Replace the main script block with obfuscated version
const result = html.replace(mainScriptFull, `<script>\n${obfuscatedCode}\n</script>`);

// Also minify the tailwind config script (tiny but still)
const tailwindMatch = html.match(/<script>\s*tailwind\.config\s*=\s*\{[^}]*\}\s*<\/script>/);
if (tailwindMatch) {
    const minified = tailwindMatch[0].replace(/\s+/g, ' ').replace(/\s*\{\s*/g, '{').replace(/\s*\}\s*/g, '}').replace(/\s*:\s*/g, ':').replace(/\s*,\s*/g, ',');
    // Not strictly necessary but harmless
}

// Write output
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}
fs.writeFileSync(distPath, result, 'utf8');
console.log(`Wrote ${distPath} (${result.length} chars)`);

// Also copy sw.js and manifest.json to dist
for (const f of ['sw.js', 'manifest.json']) {
    const src = path.join(__dirname, f);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(distDir, f));
        console.log(`Copied ${f} to dist/`);
    }
}
