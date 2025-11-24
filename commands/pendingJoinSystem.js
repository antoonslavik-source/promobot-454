const { db } = require('../utils/firebase');
const { noblox } = require('../utils/noblox');
const { hasPermission, getMainGroupIdForGuild } = require('./rankManagement');

async function acceptJoinRequest(interaction) {
  const hasPerm = await hasPermission(interaction, 'Officer');
  if (!hasPerm) return '❌ You do not have permission to accept join requests.';

  const username = interaction.options.getString('username');
  const groupId = await getMainGroupIdForGuild(interaction.guildId);
  const userId = await noblox.getIdFromUsername(username);

  // Check if the user has a pending join request
  const requests = (await noblox.getJoinRequests(groupId)).data;
  const request = requests.find(r => r.requester.userId === userId);
  if (!request) return `❌ **${username}** does not have a pending join request.`;

  // Load guild join settings
  const guildSettingsSnap = await db.ref(`servers/${interaction.guildId}/pendingJoinSystem`).once('value');
  const guildSettings = guildSettingsSnap.val() || {};

  // Check minimum account age
  const userInfo = await noblox.getPlayerInfo(userId);
  if (guildSettings.minimumAge && userInfo.age < guildSettings.minimumAge) {
    return `❌ Cannot accept **${username}**: Account age is **${userInfo.age} days**, but **${guildSettings.minimumAge} days** is required.`;
  }

  // Check required groups
  if (guildSettings.requiredGroups) {
    const requiredGroupIds = Object.keys(guildSettings.requiredGroups).map(id => Number(id));
    const userGroups = await noblox.getGroups(userId);
    const userGroupIds = userGroups.map(g => g.Id);

    const missingGroups = requiredGroupIds.filter(reqId => !userGroupIds.includes(reqId));
    if (missingGroups.length > 0) {
      return `❌ Cannot accept **${username}**: User is **not in required groups**: ${missingGroups.join(', ')}`;
    }
  }

  // All checks passed — accept the join request
  await noblox.handleJoinRequest(groupId, userId, true);

  const joinedAt = Date.now();

  // Save Roblox profile data under users/{robloxUserId}/Roblox
  const robloxProfileData = {
    DisplayName: userInfo.displayName || userInfo.username,
    Profile: `https://www.roblox.com/users/${userId}/profile`,
    UserId: userId,
    Username: userInfo.username
  };
  await db.ref(`users/${userId}/Roblox`).set(robloxProfileData);

  // Update Groups/{groupId} → joinedAt
  await db.ref(`users/${userId}/Groups/${groupId}`).update({ joinedAt });

  // Push to audit log
  await db.ref(`users/${userId}/logs`).push({
    action: 'joined_group',
    groupId,
    timestamp: joinedAt,
    performedBy: interaction.user.id,  // Discord user who accepted
  });

  return `✅ Accepted join request for **${username}**.`;
}

async function declineJoinRequest(interaction) {
  const hasPerm = await hasPermission(interaction, 'Officer');
  if (!hasPerm) return '❌ You do not have permission to decline join requests.';

  const username = interaction.options.getString('username');
  const groupId = await getMainGroupIdForGuild(interaction.guildId);
  const userId = await noblox.getIdFromUsername(username);

  await noblox.handleJoinRequest(groupId, userId, false);

  // Log decline action to audit log
  await db.ref(`users/${userId}/logs`).push({
    action: 'declined_join_request',
    groupId,
    timestamp: Date.now(),
    performedBy: interaction.user.id,
  });

  return `✅ Declined join request for **${username}**.`;
}

async function setMinimumAge(interaction) {
  const hasPerm = await hasPermission(interaction, 'Owner');
  if (!hasPerm) return '❌ You do not have permission to change join settings.';

  const guildId = interaction.guildId;
  const days = interaction.options.getInteger('days');

  await db.ref(`servers/${guildId}/pendingJoinSystem/minimumAge`).set(days);
  return `✅ Minimum account age set to **${days} days**.`;
}

async function addRequiredGroup(interaction) {
  const hasPerm = await hasPermission(interaction, 'Owner');
  if (!hasPerm) return '❌ You do not have permission to modify group requirements.';

  const guildId = interaction.guildId;
  const groupId = interaction.options.getInteger('groupid');

  await db.ref(`servers/${guildId}/pendingJoinSystem/requiredGroups/${groupId}`).set(true);
  return `✅ Added **group ID ${groupId}** as a required group.`;
}

async function removeRequiredGroup(interaction) {
  const hasPerm = await hasPermission(interaction, 'Owner');
  if (!hasPerm) return '❌ You do not have permission to modify group requirements.';

  const guildId = interaction.guildId;
  const groupId = interaction.options.getInteger('groupid');

  await db.ref(`servers/${guildId}/pendingJoinSystem/requiredGroups/${groupId}`).remove();
  return `✅ Removed **group ID ${groupId}** from required groups.`;
}

async function checkPendingUser(interaction) {
  const hasPerm = await hasPermission(interaction, 'Officer');
  if (!hasPerm) return '❌ You do not have permission to check join requests.';

  const username = interaction.options.getString('username');
  const groupId = await getMainGroupIdForGuild(interaction.guildId);
  const userId = await noblox.getIdFromUsername(username);

  const requests = (await noblox.getJoinRequests(groupId)).data;
  const request = requests.find(r => r.requester.userId === userId);
  if (!request) return `❌ **${username}** does not have a pending join request.`;

  const userInfo = await noblox.getPlayerInfo(userId);
  const guildSettingsSnap = await db.ref(`servers/${interaction.guildId}/pendingJoinSystem`).once('value');
  const guildSettings = guildSettingsSnap.val() || {};

  let output = `📋 **Join Request for ${username}**\n- Roblox User ID: ${userId}\n- Account Age: ${userInfo.age} days`;

  if (guildSettings.minimumAge) {
    output += `\n- Required Age: ${guildSettings.minimumAge} days`;
  }

  if (guildSettings.requiredGroups) {
    output += `\n- Required Groups: ${Object.keys(guildSettings.requiredGroups).join(', ')}`;
  }

  return output;
}

async function listPendingUsers(interaction) {
  const hasPerm = await hasPermission(interaction, 'Officer');
  if (!hasPerm) return '❌ You do not have permission to list join requests.';

  const groupId = await getMainGroupIdForGuild(interaction.guildId);
  const requests = (await noblox.getJoinRequests(groupId)).data;

  if (!requests.length) {
    return `✅ There are **no** pending join requests for **group ID ${groupId}**.`;
  }

  const usernames = requests.map(r => r.requester.username);
  return `📋 Pending Join Requests:\n${usernames.join(', ')}`;
}

async function showPendingJoinSettings(interaction) {
  const hasPerm = await hasPermission(interaction, 'Officer');
  if (!hasPerm) return '❌ You do not have permission to view join settings.';

  const guildSettingsSnap = await db.ref(`servers/${interaction.guildId}/pendingJoinSystem`).once('value');
  const guildSettings = guildSettingsSnap.val() || {};

  let output = `📋 **Pending Join Settings**`;
  output += `\n- Minimum Account Age: ${guildSettings.minimumAge ?? 'Not set'}`;

  if (guildSettings.requiredGroups) {
    output += `\n- Required Groups: ${Object.keys(guildSettings.requiredGroups).join(', ')}`;
  } else {
    output += `\n- Required Groups: None`;
  }

  return output;
}

module.exports = {
  acceptJoinRequest,
  declineJoinRequest,
  setMinimumAge,
  addRequiredGroup,
  removeRequiredGroup,
  checkPendingUser,
  listPendingUsers,
  showPendingJoinSettings,
};
