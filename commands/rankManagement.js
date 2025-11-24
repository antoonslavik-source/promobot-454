const { db } = require('../utils/firebase');
const { noblox } = require('../utils/noblox');

async function getMainGroupIdForGuild(guildId) {
  const snapshot = await db.ref(`servers/${guildId}/mainGroupId`).once('value');
  if (!snapshot.exists()) throw new Error('No main group configured for this server. Use /server setup first.');
  return Number(snapshot.val());
}

async function hasPermission(interaction, requiredLevel) {
  const guildId = interaction.guildId;
  const userDiscordId = interaction.user.id;

  const permConfigSnapshot = await db.ref(`servers/${guildId}/permissionLevels`).once('value');
  if (!permConfigSnapshot.exists()) return false;
  const permConfig = permConfigSnapshot.val();

  const userSnapshot = await db.ref('users').orderByChild('Discord/UserId').equalTo(userDiscordId).once('value');
  if (!userSnapshot.exists()) return false;
  const userData = Object.values(userSnapshot.val())[0];
  const userRobloxId = userData.Roblox.UserId;

  const mainGroupId = await getMainGroupIdForGuild(guildId);
  const userRank = await noblox.getRankInGroup(mainGroupId, userRobloxId);

  const order = ['Owner', 'HICOM', 'Officer', 'NCO'];
  const requiredIndex = order.indexOf(requiredLevel);
  if (requiredIndex === -1) return false;

  for (let i = 0; i <= requiredIndex; i++) {
    const level = order[i];
    const entries = permConfig[level];
    if (!entries) continue;
    if (entries.includes(userRank)) return true;
  }
  return false;
}

async function checkForSelfAction(interaction, targetUserId) {
  const snapshot = await db.ref(`users/${targetUserId}`).once('value');
  const data = snapshot.exists() ? snapshot.val() : null;
  if (data && data.Discord.UserId === interaction.user.id) throw new Error('❌ You cannot perform this action on yourself.');
}

async function getPromoterData(interaction, groupId) {
  const snapshot = await db.ref('users').orderByChild('Discord/UserId').equalTo(interaction.user.id).once('value');
  if (!snapshot.exists()) throw new Error('❌ You are not verified with Roblox.');
  const data = snapshot.val();
  const promoterRobloxUserId = Object.values(data)[0].Roblox.UserId;
  const promoterRank = await noblox.getRankInGroup(groupId, promoterRobloxUserId);
  return { promoterRobloxUserId, promoterRank };
}

async function promoteUser(interaction) {
  const guildId = interaction.guildId;
  const hasPerm = await hasPermission(interaction, 'Officer');
  if (!hasPerm) return '❌ You do not have permission to promote users.';

  const groupId = await getMainGroupIdForGuild(guildId);
  const username = interaction.options.getString('username');
  const userId = await noblox.getIdFromUsername(username);
  await checkForSelfAction(interaction, userId);

  const { promoterRank } = await getPromoterData(interaction, groupId);
  const roles = await noblox.getRoles(groupId);
  const currentRank = await noblox.getRankInGroup(groupId, userId);
  const index = roles.findIndex(role => role.rank === currentRank);
  if (index === -1 || index >= roles.length - 1) return `❌ ${username} is already at the highest rank.`;
  const nextRole = roles[index + 1];
  if (nextRole.rank >= promoterRank) return `❌ You cannot promote ${username} to ${nextRole.name}; their role would be equal or higher than yours.`;
  const result = await noblox.promote(groupId, userId);
  return `✅ Promoted **${username}** to **${result.newRole.name}**.`;
}

async function demoteUser(interaction) {
  const guildId = interaction.guildId;
  const hasPerm = await hasPermission(interaction, 'Officer');
  if (!hasPerm) return '❌ You do not have permission to demote users.';

  const groupId = await getMainGroupIdForGuild(guildId);
  const username = interaction.options.getString('username');
  const userId = await noblox.getIdFromUsername(username);
  await checkForSelfAction(interaction, userId);

  const { promoterRank } = await getPromoterData(interaction, groupId);
  const roles = await noblox.getRoles(groupId);
  const currentRank = await noblox.getRankInGroup(groupId, userId);
  const index = roles.findIndex(role => role.rank === currentRank);
  if (index === -1 || index <= 0) return `❌ ${username} is already at the lowest rank.`;
  const prevRole = roles[index - 1];
  if (prevRole.rank >= promoterRank) return `❌ You cannot demote ${username} to ${prevRole.name}; their role would be equal or higher than yours.`;
  const result = await noblox.demote(groupId, userId);
  return `✅ Demoted **${username}** to **${result.newRole.name}**.`;
}

async function setRank(interaction) {
  const guildId = interaction.guildId;
  const hasPerm = await hasPermission(interaction, 'HICOM');
  if (!hasPerm) return '❌ You do not have permission to set ranks.';

  const groupId = await getMainGroupIdForGuild(guildId);
  const username = interaction.options.getString('username');
  const rankId = interaction.options.getInteger('rankid');
  const userId = await noblox.getIdFromUsername(username);
  await checkForSelfAction(interaction, userId);

  const { promoterRank } = await getPromoterData(interaction, groupId);
  if (rankId >= promoterRank) return '❌ You cannot set a user to a rank equal to or higher than your own.';
  await noblox.setRank(groupId, userId, rankId);
  return `✅ Set **${username}** to rank ID **${rankId}**.`;
}

module.exports = {
  getMainGroupIdForGuild,
  hasPermission,
  checkForSelfAction,
  getPromoterData,
  promoteUser,
  demoteUser,
  setRank,
};
