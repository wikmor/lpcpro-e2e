// bot/bot.js — 1.19+ robust chat capture
import mineflayer from 'mineflayer';

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

// Flatten Mojang/Adventure component → plain text
function flat(c) {
  if (!c) return '';
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map(flat).join('');
  if (c.text != null) return String(c.text);
  if (c.translate) return (c.with || []).map(flat).join(' ');
  if (c.extra) return flat(c.extra);
  // last resort: try all values
  return Object.values(c).map(flat).join('');
}

// prefer system_chat first, then player_chat
let matched = false;
let sawSystem = false;
let sawPlayer = false;

function tryMatch(comp, source, rawDump) {
  const line = flat(typeof comp === 'string' ? { text: comp } : comp);
  if (DEBUG) {
    console.log(`DBG ${source} raw: ${rawDump}`);
    console.log(`DBG ${source} flat: "${line}"`);
  } else {
    console.log(`ℹ️ Chat (${source}): "${line}"`);
  }
  if (re.test(line) && !matched) {
    matched = true;
    console.log(`✅ Matched (${source}):\n  line: "${line}"\n  regex: ${re}`);
    die('OK', 0);
  }
}

bot.once('spawn', () => {
  // tiny delay so the server is quiet
  setTimeout(() => bot.chat(CHAT_MESSAGE), 1200);

  // Modern broadcasted/fully formatted messages (what we want)
  bot._client.on('system_chat', (p) => {
    sawSystem = true;
    // p.content can be string or component
    const content = p?.content ?? '';
    tryMatch(content, 'system_chat', JSON.stringify(p));
  });

  // Player chat packet (often empty unsigned content on modern servers)
  bot._client.on('player_chat', (p) => {
    sawPlayer = true;
    // Try all plausible fields in descending likelihood
    const candidates = [
      p?.unsignedChatContent,
      p?.signedChatContent,
      p?.message,
      p?.content
    ].filter(Boolean);

    // If nothing present, synthesize vanilla-like line `<name> message` (not formatted)
    if (candidates.length === 0 && (p?.name || p?.plainMessage)) {
      const synth = { translate: 'chat.type.text', with: [{ text: p.name || '' }, { text: p.plainMessage || '' }] };
      candidates.push(synth);
    }

    if (candidates.length === 0) {
      if (DEBUG) console.log(`DBG player_chat had no usable content: ${JSON.stringify(p)}`);
      return;
    }

    // If preferring system_chat, only match player_chat if we never see system_chat
    if (PREFER_SYSTEM_CHAT && sawSystem === false) {
      // okay to try; if system_chat arrives later and matches, we’ll exit then
      for (const c of candidates) {
        tryMatch(c, 'player_chat', JSON.stringify(p));
      }
    } else if (!PREFER_SYSTEM_CHAT) {
      for (const c of candidates) {
        tryMatch(c, 'player_chat', JSON.stringify(p));
      }
    }
  });

  // Timeout
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
