const admin = require('firebase-admin');
const db = admin.database();

/**
 * Handles autocomplete for Roblox usernames from the Firebase 'users' database.
 * @param {import('discord.js').AutocompleteInteraction} interaction 
 */
async function handleUsernameAutocomplete(interaction) {
  try {
    const focusedOption = interaction.options.getFocused(true);
    if (focusedOption.name !== 'username') return interaction.respond([]);

    const query = focusedOption.value.toLowerCase();
    const usersSnapshot = await db.ref('users').once('value');
    if (!usersSnapshot.exists()) return interaction.respond([]);

    const filtered = Object.values(usersSnapshot.val())
      .map(u => u.Roblox.Username)
      .filter(name => name.toLowerCase().startsWith(query))
      .slice(0, 25)
      .map(name => ({ name, value: name }));

    await interaction.respond(filtered);
  } catch (err) {
    console.error('Autocomplete error:', err);
    await interaction.respond([]);
  }
}

module.exports = { handleUsernameAutocomplete };
