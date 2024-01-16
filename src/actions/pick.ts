import { getRandomInteger } from "../clients-and-helpers/randomNumberClient";
import { SayFn } from "@slack/bolt";
import { WebClient } from "@slack/web-api";
import { getAllUserIdsInChannel } from "../clients-and-helpers/userHelpers";
import {
  getSimpleTextBlock,
  replyWithChosenUser,
  sayInThread,
} from "../clients-and-helpers/sayHelpers";
import { ContextWithConversation } from "../../types";
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
  excluded: Set<string>,
  triggeringTs: string,
  client: WebClient,
  team?: string,
) => {
  let userIds: string[] = [];
  if (!team) {
    userIds = await getAllUserIdsInChannel(channel, client);
  } else {
    // TODO pick from team
  }

  try {
    const pickedUser = await pickUser(userIds, triggeringUser, excluded);

    return replyWithChosenUser(say, triggeringUser, pickedUser, triggeringTs);
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
  { conversation: { excluded } }: ContextWithConversation,
  mentionTs: string,
  client: WebClient,
) => {
  const flagIdx = restOfCommand.findIndex((word) => word === "-t");
  const team =
    flagIdx !== -1 ? restOfCommand.slice(flagIdx + 1).join(" ") : undefined;

  return getUsersAndPick(
    say,
    triggeringUser,
    channel,
    excluded,
    mentionTs,
    client,
    team,
  );
};
