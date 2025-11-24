const noblox = require('noblox.js');

async function startRoblox(ROBLOX_COOKIE) {
  await noblox.setCookie(ROBLOX_COOKIE);
  console.log('✅ Logged into Roblox');
}

module.exports = { noblox, startRoblox };
