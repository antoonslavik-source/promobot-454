const { db } = require('../utils/firebase');
const { noblox } = require('../utils/noblox');
const { hasPermission, getMainGroupIdForGuild, getPromoterData } = require('./rankManagement');

async function handleXp(interaction) {
  const hasPerm = await hasPermission(interaction, 'Officer');
  if (!hasPerm) return '❌ You do not have permission to manage XP.';

  const guildId = interaction.guildId;
  const groupId = await getMainGroupIdForGuild(guildId);

  const username = interaction.options.getString('username');
  const action = interaction.options.getString('action');
  const value = interaction.options.getInteger('value');
  const userId = await noblox.getIdFromUsername(username);

  const { promoterRobloxUserId, promoterRank } = await getPromoterData(interaction, groupId);

  // Prevent awarding XP to users of equal or higher rank
  const userRank = await noblox.getRankInGroup(groupId, userId);
  if (userRank >= promoterRank) {
    throw new Error(`❌ You cannot award XP to users with equal or higher rank than you.`);
  }

  const xpRef = db.ref(`users/${userId}/Groups/${groupId}/xp`);
  let currentXp = (await xpRef.once('value')).val() || 0;

  switch (action) {
    case 'add':
      currentXp += value;
      break;
    case 'remove':
      currentXp = Math.max(0, currentXp - value);
      break;
    case 'set':
      currentXp = value;
      break;
  }

  await xpRef.set(currentXp);

  // Auto-promotion check:
  const requiredXpSnapshot = await db.ref(`servers/${guildId}/requiredXPForRanks`).once('value');
  const requiredXpData = requiredXpSnapshot.val() || {};

  const roles = await noblox.getRoles(groupId);
  const currentIndex = roles.findIndex(role => role.rank === userRank);

  if (currentIndex === -1 || currentIndex >= roles.length - 1) {
    return `✅ ${username} now has **${currentXp} XP**.`;
  }

  const nextRole = roles[currentIndex + 1];
  const nextRankRequiredXp = requiredXpData[nextRole.rank];

  if (nextRankRequiredXp && currentXp >= nextRankRequiredXp) {
    await noblox.setRank(groupId, userId, nextRole.rank);
    return `✅ ${username} now has **${currentXp} XP** and has been promoted to **${nextRole.name}**!`;
  }

  return `✅ ${username} now has **${currentXp} XP**.`;
}

async function editRequiredXP(interaction) {
  const guildId = interaction.guildId;
  const hasPerm = await hasPermission(interaction, 'Owner');
  if (!hasPerm) return '❌ You do not have permission to edit required XP for ranks.';

  const rankId = interaction.options.getInteger('rankid');
  const xp = interaction.options.getInteger('xp');

  await db.ref(`servers/${guildId}/requiredXPForRanks/${rankId}`).set(xp);
  return `✅ Set required XP for rank ID ${rankId} to ${xp}.`;
}

module.exports = { handleXp, editRequiredXP };
