const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const srcPath = path.join(__dirname, 'index.html');
const distDir = path.join(__dirname, 'dist');
const distPath = path.join(distDir, 'index.html');

const html = fs.readFileSync(srcPath, 'utf8');

// ── Step 1: Extract & minify <style> blocks (save placeholders) ──
const styleBlocks = [];
const htmlNoStyle = html.replace(/<style>(.*?)<\/style>/gs, (match, content) => {
    // Minify CSS
    let css = content
        .replace(/\/\*[\s\S]*?\*\//g, '')     // remove comments
        .replace(/\s+/g, ' ')                  // collapse whitespace
        .replace(/\s*([{}:;,])\s*/g, '$1')     // remove whitespace around {}:;,
        .replace(/;}/g, '}')                   // remove trailing ; before }
        .trim();
    styleBlocks.push(css);
    return `__STYLE_${styleBlocks.length - 1}__`;
});

// ── Step 2: Extract & handle inline <script> blocks ──
const scriptRegex = /<script>(.*?)<\/script>/gs;
const scriptMatches = [...htmlNoStyle.matchAll(scriptRegex)];

if (scriptMatches.length < 2) {
    console.error('Error: Expected at least 2 inline <script> blocks, found', scriptMatches.length);
    process.exit(1);
}

// Find the longest script block (main app code)
let mainMatch = scriptMatches[0];
for (const m of scriptMatches) {
    if (m[1].length > mainMatch[1].length) mainMatch = m;
}

const mainScriptContent = mainMatch[1];
const mainScriptFull = mainMatch[0];
console.log(`Main script block: ${mainScriptContent.length} chars`);

// ── Step 3: Obfuscate JS ──
const reservedNames = [
    // window.* functions called from HTML onclick/onchange
    'openFeatureGrid', 'closeFeatureGrid',
    'toggleTheme', 'changeLanguage',
    'openCloudModal', 'openModal',
    'clearSignature', 'moveFileItem',
    'toggleSplitMode', 'saveMetadata', 'resetReorder',
    'startConversion', 'removeFile',
    'moveReorderPageBtn', 'deleteReorderPageBtn',
    'toggleWatermarkSettings', 'togglePageNumberSettings', 'toggleSignatureSettings',
    'handleFilesSelected', 'selectMode', 'resetApp',
    // action functions registered in FEATURE_MODES
    'startImageToPDF', 'startMerge', 'startSplit', 'startExtractText',
    'startRotate', 'showPDFInfo', 'startCompress', 'startEncrypt',
    'startReorder', 'startPDF2Word', 'saveReorder',
    // CDN libraries
    'pdfjsLib', 'JSZip', 'PDFLib', 'docx',
    // Core globals
    'FEATURE_MODES', 'currentMode', 'selectedFiles', 'finalZipBlob',
    'translations', 'currentLang', 'isProcessing', 'modalContents',
    // Internal function names
    'initSignaturePad', 'getSigPos', 'parsePageRange',
    'getValidExtensions', 'handleNewFiles', 'getAcceptForMode',
    'updateUIState', 'renderFileList', 'loadFileThumbnails',
    'triggerDownload', 'readFileAsArrayBuffer', 'setButtonSuccess',
    'renderReorderThumbnails',
    'reorderDragStart', 'reorderDragOver', 'reorderDragLeave',
    'reorderDrop', 'reorderDragEnd',
    'refreshReorderIndices', 'getReorderIndex',
    'yieldThread',
];

const obfuscationResult = JavaScriptObfuscator.obfuscate(mainScriptContent, {
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.3,

    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,

    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,

    compact: true,
    simplify: true,

    // Preserve globals & properties
    renameGlobals: false,
    renameProperties: false,
    reservedNames: reservedNames,

    // Use mangled names for shorter output
    identifierNamesGenerator: 'mangled',

    debugProtection: false,
    domainLock: [],
    unicodeEscapeSequence: false,
    splitStrings: false,
});

const obfuscatedCode = obfuscationResult.getObfuscatedCode();
console.log(`Obfuscated: ${obfuscatedCode.length} chars (${Math.round(obfuscatedCode.length / mainScriptContent.length * 100)}% of original)`);

// ── Step 4: Replace main script with obfuscated version ──
let result = htmlNoStyle.replace(mainScriptFull, `<script>${obfuscatedCode}</script>`);

// ── Step 5: Restore minified <style> blocks ──
result = result.replace(/__STYLE_(\d+)__/g, (_, i) => `<style>${styleBlocks[parseInt(i)]}</style>`);

// ── Step 6: Minify HTML ──
// Remove HTML comments (but keep conditional comments)
result = result.replace(/<!--(?!\[if\s)[\s\S]*?-->/g, '');

// Collapse whitespace in HTML (outside of <script> and <style> tags)
// Split by <script> and <style> tags, minify only the HTML parts
const parts = [];
let remaining = result;
let idx = 0;

// Find all script/style blocks and protect them
const protectedBlocks = [];
let tempHtml = result
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => {
        protectedBlocks.push(m);
        return `__PROTECTED_${protectedBlocks.length - 1}__`;
    })
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (m) => {
        protectedBlocks.push(m);
        return `__PROTECTED_${protectedBlocks.length - 1}__`;
    });

// Minify the HTML parts
tempHtml = tempHtml
    .replace(/\s+/g, ' ')                              // collapse all whitespace to single space
    .replace(/>\s+</g, '><')                           // remove whitespace between tags
    .replace(/\s+>/g, '>')                             // remove whitespace before >
    .replace(/<\s+/g, '<')                             // remove whitespace after <
    .trim();

// Restore protected blocks
tempHtml = tempHtml.replace(/__PROTECTED_(\d+)__/g, (_, i) => protectedBlocks[parseInt(i)]);

// ── Step 7: Write output ──
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}
fs.writeFileSync(distPath, tempHtml, 'utf8');
console.log(`Wrote ${distPath} (${tempHtml.length} chars, ${tempHtml.split('\n').length} lines)`);

// Copy supporting files
for (const f of ['sw.js', 'manifest.json']) {
    const src = path.join(__dirname, f);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(distDir, f));
        console.log(`Copied ${f} to dist/`);
    }
}
