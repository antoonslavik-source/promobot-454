require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { startRoblox } = require('./utils/noblox');
const { setPermission, removePermission } = require('./commands/permissions');
const { promoteUser, demoteUser, setRank } = require('./commands/rankManagement');
const { handleXp, editRequiredXP } = require('./commands/xpSystem');
const { registerCommands } = require('./commands/registerCommands');
const { handleUsernameAutocomplete } = require('./utils/autocomplete');
const { handleServerCommand } = require('./commands/serverManagement');
const pendingJoin = require('./commands/pendingJoinSystem'); // <-- add this line

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function main() {
  await startRoblox(process.env.ROBLOX_COOKIE);

  client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
  });

  client.on('interactionCreate', async interaction => {
    if (interaction.isAutocomplete()) {
      if (['promote', 'demote', 'setrank', 'xp'].includes(interaction.commandName)) {
        await handleUsernameAutocomplete(interaction);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    try {
      switch (interaction.commandName) {
        case 'promote':
          await interaction.reply(await promoteUser(interaction));
          break;
        case 'demote':
          await interaction.reply(await demoteUser(interaction));
          break;
        case 'setrank':
          await interaction.reply(await setRank(interaction));
          break;
        case 'rank':
          if (interaction.options.getSubcommandGroup() === 'xp') {
            if (interaction.options.getSubcommand() === 'edit') {
              await interaction.reply(await editRequiredXP(interaction));
            } else {
              await interaction.reply({ content: '❌ Unknown rank/xp subcommand.', ephemeral: true });
            }
          } else {
            await interaction.reply({ content: '❌ Unknown rank subcommand group.', ephemeral: true });
          }
          break;
        case 'xp':
          await interaction.reply(await handleXp(interaction));
          break;
        case 'pendingjoin': {
          const sub = interaction.options.getSubcommand();
          const group = interaction.options.getSubcommandGroup(false);

          if (sub === 'accept') return interaction.reply(await pendingJoin.acceptJoinRequest(interaction));
          if (sub === 'decline') return interaction.reply(await pendingJoin.declineJoinRequest(interaction));
          if (sub === 'age') return interaction.reply(await pendingJoin.setMinimumAge(interaction));
          if (group === 'group' && sub === 'require_add') return interaction.reply(await pendingJoin.addRequiredGroup(interaction));
          if (group === 'group' && sub === 'require_remove') return interaction.reply(await pendingJoin.removeRequiredGroup(interaction));
          if (sub === 'check') return interaction.reply(await pendingJoin.checkPendingUser(interaction));
          if (sub === 'list') return interaction.reply(await pendingJoin.listPendingUsers(interaction));
          if (sub === 'settings') return interaction.reply(await pendingJoin.showPendingJoinSettings(interaction));

          return interaction.reply({ content: '❌ Unknown pendingjoin subcommand.', ephemeral: true });
        }
        case 'setperm':
          await interaction.reply(await setPermission(interaction));
          break;
        case 'removeperm':
          await interaction.reply(await removePermission(interaction));
          break;
        case 'server':
          if (interaction.options.getSubcommand() === 'setup') {
            await interaction.reply(await handleServerCommand(interaction));
          } else {
            await interaction.reply({ content: '❌ Unknown server subcommand.', ephemeral: true });
          }
          break;
        default:
          await interaction.reply({ content: '❌ Unknown command.', ephemeral: true });
      }
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: `❌ Error: ${error.message}`, ephemeral: true });
      } else {
        await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true });
      }
    }
  });

  await registerCommands({
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    GUILD_ID: process.env.GUILD_ID,
  });

  client.login(process.env.DISCORD_TOKEN);
}

main();
