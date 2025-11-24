const { db } = require('../utils/firebase');

async function setPermission(interaction) {
  const guildId = interaction.guildId;
  const permLevel = interaction.options.getString('permlevel');
  const rankId = interaction.options.getInteger('rankid');

  if (!rankId) throw new Error(`You must provide a rank ID for ${permLevel} permission.`);

  const ref = db.ref(`servers/${guildId}/permissionLevels/${permLevel}`);
  let existing = (await ref.once('value')).val() || [];

  if (existing.includes(rankId)) return `⚠️ Rank ID ${rankId} is already assigned to ${permLevel}.`;

  existing.push(rankId);
  await ref.set(existing);
  return `✅ Added rank ID ${rankId} to ${permLevel}.`;
}

async function removePermission(interaction) {
  const guildId = interaction.guildId;
  const permLevel = interaction.options.getString('permlevel');
  const rankId = interaction.options.getInteger('rankid');

  if (!rankId) throw new Error(`You must provide a rank ID for ${permLevel} permission.`);

  const ref = db.ref(`servers/${guildId}/permissionLevels/${permLevel}`);
  let existing = (await ref.once('value')).val() || [];

  if (!existing.includes(rankId)) return `⚠️ Rank ID ${rankId} is not assigned to ${permLevel}.`;

  existing = existing.filter(id => id !== rankId);
  await ref.set(existing);
  return `✅ Removed rank ID ${rankId} from ${permLevel}.`;
}

module.exports = { setPermission, removePermission };
