import { SayFn } from "@slack/bolt";
import { ContextWithConversation } from "../types";
import {
  getSimpleTextBlock,
  sayInThread,
} from "../clients-and-helpers/sayHelpers";
import { KnownBlock } from "@slack/types";
import { WebClient } from "@slack/web-api";
import { getUserNamesByIds } from "../clients-and-helpers/userHelpers";

export interface ManageUsersButtonPayload {
  teamId: string;
}

const getManageUsersButton = (teamId: string): KnownBlock => {
  const payload: ManageUsersButtonPayload = {
    teamId,
  };

  return {
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Manage users ",
        },
        value: JSON.stringify(payload),
        action_id: "manage_users_button_click",
      },
    ],
  };
};

export const createTeam = async (
  say: SayFn,
  restOfCommand: string[],
  context: ContextWithConversation,
  mentionTs: string,
) => {
  console.log("createTeam");
  const { teams } = context.conversation;
  const teamDisplayName = restOfCommand.join(" ");
  const teamId = teamDisplayName.toLowerCase();

  const manageUsersButton = getManageUsersButton(teamId);

  const currentTeam = teams[teamId];
  if (currentTeam) {
    return sayInThread(say, mentionTs, [
      getSimpleTextBlock(`Team "${currentTeam.displayName}" already exists`),
      manageUsersButton,
    ]);
  }

  teams[teamId] = {
    displayName: teamDisplayName,
    members: [],
  };

  await context.updateConversation({
    ...context.conversation,
    teams,
  });

  return sayInThread(say, mentionTs, [
    getSimpleTextBlock(`"${teamDisplayName}" created successfully`),
    manageUsersButton,
  ]);
};

export const showTeam = async (
  say: SayFn,
  rest: string[],
  { conversation }: ContextWithConversation,
  mentionTs: string,
  client: WebClient,
) => {
  const { teams } = conversation;
  const teamId = rest.join(" ").toLowerCase();
  const team = teams[teamId];

  const manageUsersButton = getManageUsersButton(teamId);

  if (!team) {
    return sayInThread(say, mentionTs, [
      getSimpleTextBlock("No teams created yet"),
      manageUsersButton,
    ]);
  }

  const { displayName, members } = team;

  if (members.length === 0) {
    return sayInThread(say, mentionTs, [
      getSimpleTextBlock("No users in this team"),
      manageUsersButton,
    ]);
  }

  const names = await getUserNamesByIds(client, members);

  return sayInThread(say, mentionTs, [
    getSimpleTextBlock(
      `Users in "${displayName}":\n \`\`\`${names
        .filter(Boolean)
        .map((name) => `@${name}`)
        .join("\n")}\`\`\``,
    ),
    manageUsersButton,
  ]);
};
