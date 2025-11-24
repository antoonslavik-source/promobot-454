const admin = require('firebase-admin');
const db = admin.database();

async function handleServerCommand(interaction) {
  // We expect: /server setup groupid:<number>
  if (interaction.options.getSubcommand() === 'setup') {
    const groupId = interaction.options.getInteger('groupid');
    const guildId = interaction.guildId;

    if (!groupId || isNaN(groupId)) {
      return '❌ You must provide a valid group ID.';
    }

    try {
      await db.ref(`servers/${guildId}/mainGroupId`).set(groupId);
      return `✅ Server mainGroupId set to **${groupId}**`;
    } catch (err) {
      console.error('Error setting mainGroupId:', err);
      return `❌ Failed to set mainGroupId: ${err.message}`;
    }
  }
  return '❌ Unknown subcommand for /server.';
}

module.exports = { handleServerCommand };
