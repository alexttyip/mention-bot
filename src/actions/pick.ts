import { getRandomInteger } from "../clients-and-helpers/randomNumberClient";
import { SayFn } from "@slack/bolt";
import { WebClient } from "@slack/web-api";
import { getAllUserIdsInChannel } from "../clients-and-helpers/userHelpers";
import {
  getSimpleTextBlock,
  replyWithChosenUser,
  sayInThread,
} from "../clients-and-helpers/sayHelpers";
import { ContextWithConversation, ConversationState } from "../../types";
import { throwUnexpectedError } from "../clients-and-helpers/errorHandler";

class NoEligibleUsersError extends Error {}

const pickUser = async (
  userIds: string[],
  triggeringUser: string | undefined,
  excluded: Set<string>,
) => {
  const eligibleUsers = userIds.filter(
    (userId) => userId !== triggeringUser && !excluded.has(userId),
  );

  if (eligibleUsers.length === 0) {
    throw new NoEligibleUsersError();
  }

  if (eligibleUsers.length === 1) {
    return eligibleUsers[0];
  }

  const randomNumber = await getRandomInteger(0, eligibleUsers.length - 1);
  return eligibleUsers[randomNumber];
};

export const getUsersAndPick = async (
  say: SayFn,
  triggeringUser: string | undefined,
  channel: string,
  { excluded, teams }: ConversationState,
  triggeringTs: string,
  client: WebClient,
  teamId?: string,
) => {
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
  { conversation }: ContextWithConversation,
  mentionTs: string,
  client: WebClient,
) => {
  const flagIdx = restOfCommand.findIndex(
    (word) => word === "-t" || word === "--team",
  );
  const team =
    flagIdx !== -1 ? restOfCommand.slice(flagIdx + 1).join(" ") : undefined;

  return getUsersAndPick(
    say,
    triggeringUser,
    channel,
    conversation,
    mentionTs,
    client,
    team,
  );
};
