// Export subtitle cues from the page: node export_cues.mjs  (LIB env = library folder)
import path from 'path'; import fs from 'fs'; import { pathToFileURL, fileURLToPath } from 'url';
const LIB = process.env.LIB; const HERE = path.dirname(fileURLToPath(import.meta.url));
const { openDemo } = await import(pathToFileURL(path.join(LIB, 'core/render/page.mjs')).href);
const r = await openDemo(path.join(HERE, '..'), { w: 1080, h: 1920, q: 'part=4' }); const page = r.page || r;
const cues = await page.evaluate(() => window.CUES);
fs.mkdirSync(path.join(HERE, 'out'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'out/cues.json'), JSON.stringify(cues, null, 1));
console.log('cues', cues.length); process.exit(0);
