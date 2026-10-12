import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const survey = path.dirname(dir);
const root = path.resolve(survey, '../..');
let html = fs.readFileSync(path.join(survey, 'index.html'), 'utf8');
html = html.replace('<head>', '<head><base target="_top">');
html = html.replace('<link rel="stylesheet" href="./styles.css?v=1">',
  `<style>${fs.readFileSync(path.join(survey, 'styles.css'), 'utf8')}</style>`);
html = html.replace('<link rel="stylesheet" href="../../theme.css?v=1">',
  `<style>${fs.readFileSync(path.join(root, 'theme.css'), 'utf8')}</style>`);
html = html.replaceAll('href="../../"', 'href="https://choihwashik-collab.github.io/ai-math-lab/"');
html = html.replace('<script src="./config.js?v=2"></script>',
  '<script>window.SURVEY_CONFIG = {appUrl: <?!= JSON.stringify(appUrl) ?>, initialRoom: <?!= JSON.stringify(initialRoom).replace(/</g, "\\u003c") ?>, initialMode: <?!= JSON.stringify(initialMode).replace(/</g, "\\u003c") ?>};</script>');
html = html.replace('<script src="./script.js?v=2"></script>',
  `<script>${fs.readFileSync(path.join(survey, 'script.js'), 'utf8')}</script>`);
fs.writeFileSync(path.join(dir, 'Index.html'), html);
console.log('Built standalone Apps Script Index.html');
