import { getRandomInteger } from "../clients-and-helpers/randomNumberClient";
import { SayFn } from "@slack/bolt";
import { WebClient } from "@slack/web-api";
import { getAllUserIdsInChannel } from "../clients-and-helpers/userHelpers";
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

  try {
    const pickedUser = await pickUser(userIds, triggeringUser, excluded);

    return replyWithChosenUser(
      say,
      context,
      triggeringUser,
      pickedUser,
      triggeringTs,
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

  const flagIdx = restOfCommand.findIndex(
    (word) => word === "-t" || word === "--team",
  );
  const team =
    flagIdx !== -1 ? restOfCommand.slice(flagIdx + 1).join(" ") : undefined;

  return getUsersAndPick(
    say,
    triggeringUser,
    channel,
    context,
    mentionTs,
    client,
    team,
  );
};
