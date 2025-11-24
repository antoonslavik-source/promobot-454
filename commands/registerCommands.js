const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const PERMISSION_LEVELS = ['Owner', 'HICOM', 'Officer', 'NCO'];

async function registerCommands({ DISCORD_TOKEN, CLIENT_ID, GUILD_ID }) {
  const commands = [
    new SlashCommandBuilder()
      .setName('promote')
      .setDescription('Promote a Roblox user in the configured group')
      .addStringOption(option =>
        option.setName('username').setDescription('Roblox username').setRequired(true).setAutocomplete(true))
      .toJSON(),

    new SlashCommandBuilder()
      .setName('demote')
      .setDescription('Demote a Roblox user in the configured group')
      .addStringOption(option =>
        option.setName('username').setDescription('Roblox username').setRequired(true).setAutocomplete(true))
      .toJSON(),

    new SlashCommandBuilder()
      .setName('setrank')
      .setDescription('Set a Roblox user’s rank in the configured group')
      .addStringOption(option =>
        option.setName('username').setDescription('Roblox username').setRequired(true).setAutocomplete(true))
      .addIntegerOption(option =>
        option.setName('rankid').setDescription('Rank ID to set').setRequired(true))
      .toJSON(),

    new SlashCommandBuilder()
      .setName('xp')
      .setDescription('Add, remove, or set XP for a Roblox user')
      .addStringOption(option =>
        option.setName('username').setDescription('Roblox username').setRequired(true).setAutocomplete(true))
      .addStringOption(option =>
        option.setName('action').setDescription('Action to perform').setRequired(true)
          .addChoices(
            { name: 'Add', value: 'add' },
            { name: 'Remove', value: 'remove' },
            { name: 'Set', value: 'set' },
          ))
      .addIntegerOption(option =>
        option.setName('value').setDescription('XP value').setRequired(true))
      .toJSON(),

    new SlashCommandBuilder()
      .setName('rank')
      .setDescription('Manage rank-related settings')
      .addSubcommandGroup(group =>
        group
          .setName('xp')
          .setDescription('XP-related rank settings')
          .addSubcommand(subcommand =>
            subcommand
              .setName('edit')
              .setDescription("Edit an individual rank's XP")
              .addIntegerOption(option =>
                option.setName('rankid').setDescription('Rank ID').setRequired(true))
              .addIntegerOption(option =>
                option.setName('xp').setDescription('Required XP').setRequired(true))
          )
      )
      .toJSON(),

    new SlashCommandBuilder()
      .setName('setperm')
      .setDescription('Add a rank ID to a permission level')
      .addStringOption(option =>
        option.setName('permlevel').setDescription('Permission level').setRequired(true)
          .addChoices(...PERMISSION_LEVELS.map(level => ({ name: level, value: level }))))
      .addIntegerOption(option =>
        option.setName('rankid').setDescription('Rank ID to add').setRequired(true))
      .toJSON(),

    new SlashCommandBuilder()
      .setName('removeperm')
      .setDescription('Remove a rank ID from a permission level')
      .addStringOption(option =>
        option.setName('permlevel').setDescription('Permission level').setRequired(true)
          .addChoices(...PERMISSION_LEVELS.map(level => ({ name: level, value: level }))))
      .addIntegerOption(option =>
        option.setName('rankid').setDescription('Rank ID to remove').setRequired(true))
      .toJSON(),

    new SlashCommandBuilder()
      .setName('server')
      .setDescription('Server management commands')
      .addSubcommand(subcommand =>
        subcommand
          .setName('setup')
          .setDescription('Set the main Roblox group ID for this server')
          .addIntegerOption(option =>
            option.setName('group_id').setDescription('Roblox group ID').setRequired(true)))
      .toJSON(),

    // ✅ NEW /pendingjoin COMMAND
    new SlashCommandBuilder()
      .setName('pendingjoin')
      .setDescription('Manage pending Roblox group join requests')
      .addSubcommand(sub =>
        sub.setName('accept')
          .setDescription('Accept a pending join request')
          .addStringOption(option =>
            option.setName('username').setDescription('Roblox username').setRequired(true)))
      .addSubcommand(sub =>
        sub.setName('decline')
          .setDescription('Decline a pending join request')
          .addStringOption(option =>
            option.setName('username').setDescription('Roblox username').setRequired(true)))
      .addSubcommand(sub =>
        sub.setName('age')
          .setDescription('Set the minimum Roblox account age required (in days)')
          .addIntegerOption(option =>
            option.setName('days').setDescription('Minimum account age in days').setRequired(true)))
      .addSubcommandGroup(group =>
        group.setName('group')
          .setDescription('Manage required groups for join approval')
          .addSubcommand(sub =>
            sub.setName('require_add')
              .setDescription('Add a required Roblox group ID')
              .addIntegerOption(option =>
                option.setName('groupid').setDescription('Roblox group ID').setRequired(true)))
          .addSubcommand(sub =>
            sub.setName('require_remove')
              .setDescription('Remove a required Roblox group ID')
              .addIntegerOption(option =>
                option.setName('groupid').setDescription('Roblox group ID').setRequired(true))))
      .addSubcommand(sub =>
        sub.setName('check')
          .setDescription('Check a specific user’s pending join request')
          .addStringOption(option =>
            option.setName('username').setDescription('Roblox username').setRequired(true)))
      .addSubcommand(sub =>
        sub.setName('list')
          .setDescription('List all pending join requests'))
      .addSubcommand(sub =>
        sub.setName('settings')
          .setDescription('View current settings for pending join approvals'))
      .toJSON(),
  ];

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log('✅ Successfully registered all commands.');
}

module.exports = { registerCommands };
