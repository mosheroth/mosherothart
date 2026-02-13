#!/usr/bin/env node
/**
 * Publish new artwork: add to site + get URL for Instagram.
 * Usage:
 *   node scripts/publish-artwork.mjs --image ./my-painting.png --title-he "כותרת" --slug my-painting --price "₪200" --size "30 × 40 cm" --medium "צבעי מים"
 * Optional: --body "תיאור קצר" --subjects "stilllife,landscape"
 * After deploy, post to Instagram:
 *   node scripts/publish-artwork.mjs --post-to-instagram --slug xxx
 * Env: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID (ig-user-id)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'public', 'images');
const ARTWORKS_DIR = path.join(ROOT, 'src', 'content', 'artworks');

const SITE_BASE = 'https://mosheroth.github.io/art';
const SUBJECT_SLUGS = ['sea', 'figure', 'landscape', 'stilllife', 'urban', 'hod-hasharon', 'yarkon', 'tel-aviv'];

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--post-to-instagram') {
      out.post_to_instagram = 'true';
      continue;
    }
    if (args[i].startsWith('--') && args[i + 1] !== undefined) {
      out[args[i].slice(2).replace(/-/g, '_')] = args[i + 1];
      i++;
    }
  }
  return out;
}

function parseFrontmatter(mdPath) {
  const raw = fs.readFileSync(mdPath, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const obj = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) obj[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return obj;
}

async function postToInstagram(slug, caption, imageUrl) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  if (!token || !accountId) {
    console.error('For Instagram post set env: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID');
    console.error('See docs/PUBLISH-WORKFLOW.md for setup.');
    process.exit(1);
  }
  const createParams = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: token,
  });
  const createRes = await fetch(`https://graph.facebook.com/v21.0/${accountId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: createParams.toString(),
  });
  const createData = await createRes.json();
  if (createData.error) {
    console.error('Instagram API error:', createData.error.message || JSON.stringify(createData.error));
    process.exit(1);
  }
  const creationId = createData.id;
  const publishParams = new URLSearchParams({
    creation_id: creationId,
    access_token: token,
  });
  const publishRes = await fetch(`https://graph.facebook.com/v21.0/${accountId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: publishParams.toString(),
  });
  const publishData = await publishRes.json();
  if (publishData.error) {
    console.error('Instagram publish error:', publishData.error.message || JSON.stringify(publishData.error));
    process.exit(1);
  }
  console.log('Posted to Instagram. Post ID:', publishData.id);
}

function slugFromTitleHe(titleHe) {
  return (titleHe || '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0590-\u05FF\-]/g, '')
    .toLowerCase() || 'artwork';
}

function escapeYaml(str) {
  if (!str) return '';
  if (/[:\n"#]/.test(str)) return `"${str.replace(/"/g, '\\"')}"`;
  return str;
}

async function run() {
  const a = parseArgs();

  if (a.post_to_instagram && a.slug) {
    const slug = a.slug;
    const mdPath = path.join(ARTWORKS_DIR, slug + '.md');
    if (!fs.existsSync(mdPath)) {
      console.error('Artwork not found:', mdPath);
      process.exit(1);
    }
    const meta = parseFrontmatter(mdPath);
    if (!meta || !meta.image) {
      console.error('Could not read artwork frontmatter.');
      process.exit(1);
    }
    const imageUrl = SITE_BASE + meta.image;
    const artworkUrl = `${SITE_BASE}/artwork/${slug}`;
    const caption = [
      meta.titleHe || slug,
      meta.price || '',
      [meta.size, meta.medium].filter(Boolean).join(' | '),
      '',
      'לרכישה / לפרטים — לינק בביוגרפיה 🔗',
      artworkUrl,
    ]
      .filter(Boolean)
      .join('\n');
    await postToInstagram(slug, caption, imageUrl);
    return;
  }

  const imagePath = a.image;
  const titleHe = a.title_he || a.titleHe;
  const slug = a.slug || slugFromTitleHe(titleHe);
  const price = a.price;
  const size = a.size;
  const medium = a.medium;
  const body = a.body || '';
  const subjectsStr = a.subjects || '';

  if (!imagePath || !fs.existsSync(path.resolve(ROOT, imagePath))) {
    console.error('Usage: node scripts/publish-artwork.mjs --image <path> --title-he "כותרת" [--slug xxx] --price "₪200" --size "30 × 40 cm" --medium "צבעי מים" [--body "תיאור"] [--subjects stilllife,landscape]');
    console.error('--image is required and must be an existing file.');
    process.exit(1);
  }

  if (!titleHe || !price || !size || !medium) {
    console.error('Required: --title-he, --price, --size, --medium');
    process.exit(1);
  }

  const ext = path.extname(imagePath).toLowerCase() || '.png';
  const imageName = slug + ext;
  const destImage = path.join(IMAGES_DIR, imageName);
  const mdPath = path.join(ARTWORKS_DIR, slug + '.md');

  if (fs.existsSync(mdPath)) {
    console.error('Artwork already exists:', mdPath);
    process.exit(1);
  }

  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  fs.mkdirSync(ARTWORKS_DIR, { recursive: true });

  fs.copyFileSync(path.resolve(ROOT, imagePath), destImage);
  console.log('Copied image to public/images/' + imageName);

  const titleEn = (titleHe || '').replace(/[^\w\s\-]/g, '').trim() || slug;
  const subjects = subjectsStr
    ? subjectsStr.split(',').map((s) => s.trim()).filter((s) => SUBJECT_SLUGS.includes(s))
    : [];

  const frontmatter = [
    '---',
    `title: ${escapeYaml(titleEn)}`,
    `titleHe: ${escapeYaml(titleHe)}`,
    `image: /images/${imageName}`,
    'category: for-sale',
    'year: "2025"',
    `medium: ${escapeYaml(medium)}`,
    `size: ${escapeYaml(size)}`,
    `price: ${escapeYaml(price)}`,
    'sold: false',
    subjects.length ? `subjects: [${subjects.join(', ')}]` : '',
    '---',
  ]
    .filter(Boolean)
    .join('\n');

  const content = body.trim() ? `\n${body.trim()}\n` : '\n';
  fs.writeFileSync(mdPath, frontmatter + content, 'utf8');
  console.log('Created src/content/artworks/' + slug + '.md');

  const artworkUrl = `${SITE_BASE}/artwork/${slug}`;
  console.log('\n---');
  console.log('Artwork URL (for Instagram link):');
  console.log(artworkUrl);
  console.log('\nSuggested Instagram caption (copy and add link):');
  console.log('---');
  console.log(`${titleHe}`);
  if (price) console.log(price);
  console.log(`${size} | ${medium}`);
  console.log(`\nלרכישה / לפרטים — לינק בביוגרפיה 🔗`);
  console.log('---');
  console.log('\nNext: git add, commit, push. After deploy, post to Instagram:');
  console.log(`  node scripts/publish-artwork.mjs --post-to-instagram --slug ${slug}`);
  console.log('  (Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_ACCOUNT_ID - see docs/PUBLISH-WORKFLOW.md)');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
