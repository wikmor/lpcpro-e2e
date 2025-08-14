// bot/bot.js — 1.19+ chat capture (arrays/NBT safe, no [object Object], JSON emit)
import mineflayer from 'mineflayer';
import * as nbt from 'prismarine-nbt';

const HOST = process.env.MC_HOST || 'server';
const PORT = parseInt(process.env.MC_PORT || '25565', 10);
const USERNAME = process.env.BOT_USERNAME || 'EnderBot';
const CHAT_MESSAGE = process.env.CHAT_MESSAGE || 'hello from e2e';
const EXPECTED_REGEX = process.env.EXPECTED_REGEX || ''; // empty => skip regex
const LISTEN_TIMEOUT_MS = parseInt(process.env.LISTEN_TIMEOUT_MS || '15000', 10);
const PREFER_SYSTEM_CHAT = (process.env.PREFER_SYSTEM_CHAT || 'true').toLowerCase() === 'true';
const DEBUG = (process.env.BOT_DEBUG || 'false').toLowerCase() === 'true';

const bot = mineflayer.createBot({ host: HOST, port: PORT, username: USERNAME });

function die(msg, code = 1) { if (code !== 0) console.error(msg); try { bot.end(); } catch {} process.exit(code); }
const doRegex = EXPECTED_REGEX.length > 0;
const re = doRegex ? new RegExp(EXPECTED_REGEX) : null;

// ---------- helpers ----------
function safeDump(obj) { try { return JSON.stringify(obj); } catch { return String(obj); } }

// normalize: arrays → {text:'', extra:[...]}, NBT → plain JS object
function normalize(comp) {
  if (!comp) return { text: '' };
  if (typeof comp === 'string') return { text: comp };
  if (Array.isArray(comp)) return { text: '', extra: comp.map(normalize) };

  // NBT compound as chat component
  if (comp && typeof comp === 'object' && comp.type === 'compound' && comp.value) {
    try {
      const simplified = nbt.simplify(comp);
      return normalize(simplified);
    } catch {
      return { text: '' };
    }
  }

  // object: normalize nested fields we care about
  const out = { ...comp };
  if (out.extra) out.extra = Array.isArray(out.extra) ? out.extra.map(normalize) : normalize(out.extra);
  if (out.with)  out.with  = Array.isArray(out.with)  ? out.with.map(normalize)  : normalize(out.with);
  return out;
}

// flatten to human string — avoid "[object Object]"
function flat(comp) {
  // fast paths
  if (!comp) return '';
  if (typeof comp === 'string') return comp;
  if (Array.isArray(comp)) return comp.map(flat).join('');

  const c = normalize(comp);

  // text node
  let parts = [];
  if (typeof c.text === 'string') parts.push(c.text);

  // translation with args
  if (c.translate) {
    const withArr = Array.isArray(c.with) ? c.with : (c.with ? [c.with] : []);
    parts.push(withArr.map(flat).join(' '));
  }

  // score (take value if present)
  if (c.score && typeof c.score === 'object') {
    if (c.score.value != null) parts.push(String(c.score.value));
  }

  // weird empty-key node: {"": "Nick"} → treat value as text
  if (c[''] != null && typeof c[''] === 'string') {
    parts.push(c['']);
  }

  // children
  if (c.extra) parts.push(flat(c.extra));

  // if nothing collected, try flattening values (but ignore events/colors/style)
  if (parts.length === 0 && typeof c === 'object') {
    const IGNORE = new Set([
      'bold','italic','underlined','strikethrough','obfuscated','insertion','color',
      'clickEvent','hoverEvent','font','keybind','selector','nbt','block','entity','storage'
    ]);
    const more = Object.entries(c)
      .filter(([k]) => !IGNORE.has(k))
      .map(([,v]) => flat(v))
      .join('');
    if (more) parts.push(more);
  }

  return parts.join('');
}

function emitPacketJson(tag, comp) {
  const obj = normalize(comp);
  const json = JSON.stringify(obj);
  const b64 = Buffer.from(json, 'utf8').toString('base64');
  console.log(`${tag}=${b64}`);
}

// ---------- flow ----------
let matched = false;
let sawSystem = false;
let sawPlayer = false;

function tryMatch(comp, source, rawDump) {
  const line = flat(comp);
  if (DEBUG) {
    console.log(`DBG ${source} raw: ${rawDump}`);
    console.log(`DBG ${source} flat: "${line}"`);
  } else {
    console.log(`ℹ️ Chat (${source}): "${line}"`);
  }

  // Always emit JSON snapshot from system_chat for strict JSON comparison
  if (source === 'system_chat') emitPacketJson('E2E_PACKET_JSON', comp);

  if (doRegex && !matched && re.test(line)) {
    matched = true;
    console.log(`✅ Matched (${source}):\n  line: "${line}"\n  regex: ${re}`);
    die('OK', 0);
  }
}

bot.once('spawn', () => {
  setTimeout(() => bot.chat(CHAT_MESSAGE), 1200);

  // Preferred: fully formatted component
  bot._client.on('system_chat', (p) => {
    sawSystem = true;
    const content = p?.content ?? '';
    tryMatch(content, 'system_chat', safeDump(p));
  });

  // Fallback: player_chat (may be bare content)
  bot._client.on('player_chat', (p) => {
    sawPlayer = true;
    const candidates = [
      p?.unsignedChatContent,
      p?.signedChatContent,
      p?.message,
      p?.content
    ].filter(Boolean);

    if (candidates.length === 0 && (p?.name || p?.plainMessage)) {
      const synth = { translate: 'chat.type.text', with: [{ text: p.name || '' }, { text: p.plainMessage || '' }] };
      candidates.push(synth);
    }

    if (candidates.length === 0) {
      if (DEBUG) console.log(`DBG player_chat had no usable content: ${safeDump(p)}`);
      return;
    }

    if (PREFER_SYSTEM_CHAT && !sawSystem) {
      for (const c of candidates) tryMatch(c, 'player_chat', safeDump(p));
    } else if (!PREFER_SYSTEM_CHAT) {
      for (const c of candidates) tryMatch(c, 'player_chat', safeDump(p));
    }
  });

  // Legacy/unified chat packet (≤1.19.2 and some server impls)
  bot._client.on('chat', (p) => {
    // p.message is usually the component; sometimes it's a string
    const comp = p?.message ?? '';
    tryMatch(comp, 'chat', safeDump(p));
  });

  // 1.19.3 server-decorated messages (client renders like player chat)
  bot._client.on('disguised_chat', (p) => {
    // typical fields: p.message (component) and p.sender (UUID), p.type…
    const comp = p?.message ?? p?.content ?? '';
    tryMatch(comp, 'disguised_chat', safeDump(p));
  });

  setTimeout(() => {
    let hint = 'No matching chat seen.';
    if (PREFER_SYSTEM_CHAT && sawPlayer && !sawSystem) {
      hint = 'Saw player_chat but no system_chat; your server may only emit formatted text via player_chat or a different channel.';
    }
    if (doRegex) {
      die(`❌ Timed out waiting for chat match: ${re}\n${hint}\nTip: set BOT_DEBUG=true to dump packets.`, 1);
    } else {
      // No regex expected → succeed once we emitted JSON (or fail if none seen)
      if (sawSystem) die('OK', 0);
      die(`❌ Timed out waiting for system_chat to emit JSON.\nTip: ensure your plugin sends the formatted Component via Audience.sendMessage in E2E.`, 1);
    }
  }, LISTEN_TIMEOUT_MS);
});

bot.on('kicked', (r) => die(`❌ Bot kicked: ${r}`));
bot.on('end', () => { if (!matched && doRegex) die('❌ Disconnected before match', 1); });
bot.on('error', (e) => die(`❌ Bot error: ${e}`, 1));
