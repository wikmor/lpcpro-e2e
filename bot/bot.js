// bot/bot.js — 1.19+ robust chat capture (arrays/NBT-safe + JSON emit)
import mineflayer from 'mineflayer';
import * as nbt from 'prismarine-nbt';

const HOST = process.env.MC_HOST || 'server';
const PORT = parseInt(process.env.MC_PORT || '25565', 10);
const USERNAME = process.env.BOT_USERNAME || 'EnderBot';
const CHAT_MESSAGE = process.env.CHAT_MESSAGE || 'hello from e2e';
const EXPECTED_REGEX = process.env.EXPECTED_REGEX || '.*';
const LISTEN_TIMEOUT_MS = parseInt(process.env.LISTEN_TIMEOUT_MS || '15000', 10);
const PREFER_SYSTEM_CHAT = (process.env.PREFER_SYSTEM_CHAT || 'true').toLowerCase() === 'true';
const DEBUG = (process.env.BOT_DEBUG || 'false').toLowerCase() === 'true';

const bot = mineflayer.createBot({ host: HOST, port: PORT, username: USERNAME });

function die(msg, code = 1) { if (code !== 0) console.error(msg); try { bot.end(); } catch {} process.exit(code); }
const re = new RegExp(EXPECTED_REGEX);

// --- helpers ---

// Convert possible NBT or other shapes into a Mojang/Adventure-like component object
function toComponentObject(c) {
  if (!c) return { text: '' };
  if (typeof c === 'string') return { text: c };

  // Array of components → treat as {text:"", extra:[...]}
  if (Array.isArray(c)) return { text: '', extra: c };

  // Already a (likely) component?
  if (c.text != null || c.translate != null || c.extra != null) return c;

  // system_chat on some 1.21 builds: NBT compound holding chat component
  if (typeof c === 'object' && c.type === 'compound' && c.value) {
    try {
      const simplified = nbt.simplify(c); // plain JS
      if (simplified && (simplified.text != null || simplified.translate != null || simplified.extra != null)) {
        return simplified;
      }
      return { text: String(simplified) };
    } catch (e) {
      if (DEBUG) console.log('DBG NBT simplify error:', e);
      return { text: '<<invalid-nbt>>' };
    }
  }

  // Fallback: stringify unknown object
  return { text: String(c) };
}

// Flatten Mojang/Adventure component → plain text
function flat(comp) {
  // Handle arrays BEFORE normalization to avoid "[object Object],..."
  if (Array.isArray(comp)) return comp.map(flat).join('');
  if (typeof comp === 'string') return comp;

  const c = toComponentObject(comp);
  if (!c) return '';

  let out = '';

  // text node
  if (c.text != null) out += String(c.text);

  // translation node: join arguments human-readably
  if (c.translate) {
    const withArr = c.with || [];
    out += withArr.map(flat).join(' ');
  }

  // extra children
  if (c.extra) out += flat(c.extra);

  // last resort: join unknown fields' flattened values
  if (!out && typeof c === 'object') {
    out = Object.values(c).map(flat).join('');
  }
  return out;
}

function emitPacketJson(tag, comp) {
  try {
    const obj = toComponentObject(comp);
    const json = JSON.stringify(obj);
    const b64 = Buffer.from(json, 'utf8').toString('base64');
    console.log(`${tag}=${b64}`);
  } catch (e) {
    if (DEBUG) console.log('DBG emitPacketJson error:', e);
  }
}

// prefer system_chat first, then player_chat
let matched = false;
let sawSystem = false;
let sawPlayer = false;

function safeDump(obj) {
  try { return JSON.stringify(obj); } catch { return String(obj); }
}

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

  if (!matched && re.test(line)) {
    matched = true;
    console.log(`✅ Matched (${source}):\n  line: "${line}"\n  regex: ${re}`);
    die('OK', 0);
  }
}

bot.once('spawn', () => {
  setTimeout(() => bot.chat(CHAT_MESSAGE), 1200);

  // Fully formatted messages (preferred for E2E)
  bot._client.on('system_chat', (p) => {
    sawSystem = true;
    const content = p?.content ?? '';
    tryMatch(content, 'system_chat', safeDump(p));
  });

  // Player chat packet
  bot._client.on('player_chat', (p) => {
    sawPlayer = true;
    const candidates = [
      p?.unsignedChatContent,
      p?.signedChatContent,
      p?.message,
      p?.content
    ].filter(Boolean);

    if (candidates.length === 0 && (p?.name || p?.plainMessage)) {
      // Synthesize vanilla-like "<name> message" if needed
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

  setTimeout(() => {
    let hint = 'No matching chat seen.';
    if (PREFER_SYSTEM_CHAT && sawPlayer && !sawSystem) {
      hint = 'Saw player_chat but no system_chat; your server may only emit formatted text via player_chat or a different channel.';
    }
    die(`❌ Timed out waiting for chat match: ${re}\n${hint}\nTip: set BOT_DEBUG=true to dump packets.`, 1);
  }, LISTEN_TIMEOUT_MS);
});

bot.on('kicked', (r) => die(`❌ Bot kicked: ${r}`));
bot.on('end', () => { if (!matched) die('❌ Disconnected before match', 1); });
bot.on('error', (e) => die(`❌ Bot error: ${e}`, 1));
