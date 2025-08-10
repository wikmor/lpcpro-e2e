import mineflayer from 'mineflayer';

const HOST = process.env.MC_HOST || 'server';
const PORT = parseInt(process.env.MC_PORT || '25565', 10);
const USERNAME = process.env.BOT_USERNAME || 'EnderBot';
const CHAT_MESSAGE = process.env.CHAT_MESSAGE || 'hello from e2e';
const EXPECTED_REGEX = process.env.EXPECTED_REGEX || '.*';
const LISTEN_TIMEOUT_MS = parseInt(process.env.LISTEN_TIMEOUT_MS || '15000', 10);

const bot = mineflayer.createBot({ host: HOST, port: PORT, username: USERNAME });

function die(msg, code = 1) { console.error(msg); try { bot.end(); } catch {} process.exit(code); }
const re = new RegExp(EXPECTED_REGEX);

// Flatten Mojang/Adventure JSON into plain text
function flat(c) {
  if (!c) return '';
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map(flat).join('');
  if (c.text != null) return String(c.text);
  if (c.translate) return (c.with || []).map(flat).join(' ');
  if (c.extra) return flat(c.extra);
  return Object.values(c).map(flat).join('');
}

function handle(comp, source) {
  const line = flat(typeof comp === 'string' ? { text: comp } : comp);
  console.log(`ℹ️ Chat (${source}): "${line}"`);
  if (re.test(line)) {
    console.log(`✅ Matched:\n  line: "${line}"\n  regex: ${re}`);
    die('OK', 0);
  }
}

bot.once('spawn', () => {
  // Send a chat line after a short delay so startup noise settles
  setTimeout(() => bot.chat(CHAT_MESSAGE), 1200);

  // 1.19+ modern packets
  bot._client.on('player_chat', (p) => {
    const comp = p.unsignedChatContent || p.signedChatContent || p.message || p.content;
    handle(comp, 'player_chat');
  });

  bot._client.on('system_chat', (p) => {
    handle(p.content, 'system_chat');
  });

  setTimeout(() => die(`❌ Timed out waiting for chat match: ${re}`), LISTEN_TIMEOUT_MS);
});

bot.on('kicked', (r) => die(`❌ Bot kicked: ${r}`));
bot.on('end', () => die('❌ Disconnected before match'));
bot.on('error', (e) => die(`❌ Bot error: ${e}`));
