import { getRandomInteger } from "../clients-and-helpers/randomNumberClient";
import { SayFn } from "@slack/bolt";
import { WebClient } from "@slack/web-api";
import {
  getAllUserIdsInChannel,
  getAllUserIdsInMessage,
} from "../clients-and-helpers/userHelpers";
import {
  getSimpleTextBlock,
  replyWithChosenUser,
  sayInThread,
} from "../clients-and-helpers/sayHelpers";
import { ContextWithConversation } from "../types";
import { throwUnexpectedError } from "../clients-and-helpers/errorHandler";

class NoEligibleUsersError extends Error {}

const pickUser = async (
  userIds: string[],
  triggeringUser: string | undefined,
  excluded: string[],
): Promise<string> => {
  const eligibleUsers = userIds.filter(
    (userId) => userId !== triggeringUser && !excluded.includes(userId),
  );

  if (eligibleUsers.length === 0) {
    throw new NoEligibleUsersError();
  }

  if (eligibleUsers.length === 1) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return eligibleUsers[0]!;
  }

  const randomNumber = await getRandomInteger(0, eligibleUsers.length - 1);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return eligibleUsers[randomNumber]!;
};

export const getUsersAndPick = async (
  say: SayFn,
  triggeringUser: string,
  channel: string,
  context: ContextWithConversation,
  triggeringTs: string,
  client: WebClient,
  excludedInPick: string[],
  teamId?: string,
) => {
  const {
    conversation: { excluded, teams },
  } = context;
  let userIds: string[] = [];

  if (!teamId) {
    userIds = await getAllUserIdsInChannel(channel, client);
  } else {
    const team = teams[teamId];
    if (!team) {
      return sayInThread(say, triggeringTs, [
        getSimpleTextBlock("Team not found"),
      ]);
    }

    userIds = [...team.members];
  }

  const allExcludedMembers = [...excludedInPick, ...excluded];

  try {
    const pickedUser = await pickUser(
      userIds,
      triggeringUser,
      allExcludedMembers,
    );

    return replyWithChosenUser(
      say,
      context,
      triggeringUser,
      pickedUser,
      triggeringTs,
      excludedInPick,
      teamId,
    );
  } catch (error) {
    if (error instanceof NoEligibleUsersError) {
      return sayInThread(say, triggeringTs, [
        getSimpleTextBlock("No eligible users to pick from"),
      ]);
    }

    console.error(error);
    return throwUnexpectedError(client, channel, triggeringTs);
  }
};

export const pick = async (
  say: SayFn,
  triggeringUser: string | undefined,
  channel: string,
  restOfCommand: string[],
  context: ContextWithConversation,
  mentionTs: string,
  client: WebClient,
) => {
  if (!triggeringUser) {
    return throwUnexpectedError(client, channel, mentionTs);
  }

  const teamFlagIdx = restOfCommand.findIndex(
    (word) => word === "-t" || word === "--team",
  );

  const excludeTagIdx = restOfCommand.findIndex(
    (word) => word === "-e" || word === "--exclude",
  );

  const team =
    teamFlagIdx !== -1
      ? restOfCommand
          .slice(
            teamFlagIdx + 1,
            excludeTagIdx !== -1 ? excludeTagIdx : undefined,
          )
          .join(" ")
      : undefined;

  const excludedInPick =
    excludeTagIdx !== -1
      ? getAllUserIdsInMessage(restOfCommand.slice(excludeTagIdx + 1))
      : [];

  return getUsersAndPick(
    say,
    triggeringUser,
    channel,
    context,
    mentionTs,
    client,
    excludedInPick,
    team,
  );
};
