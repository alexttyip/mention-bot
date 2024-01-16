import { ContextWithConversation } from "../../types";
import { getAllUserIdsInMessage } from "../clients-and-helpers/userHelpers";
import { WebClient } from "@slack/web-api";
import { SayFn } from "@slack/bolt";
import {
  getSimpleTextBlock,
  sayInThread,
} from "../clients-and-helpers/sayHelpers";

export const exclude = async (
  channel: string,
  restOfCommand: string[],
  context: ContextWithConversation,
  mentionTs: string,
  client: WebClient,
) => {
  const { conversation } = context;

  for (const userId of getAllUserIdsInMessage(restOfCommand)) {
    conversation.excluded.add(userId);
  }

  await context.updateConversation(conversation);

  await client.reactions.add({
    channel,
    timestamp: mentionTs,
    name: "ok_hand",
  });
};

export const include = async (
  channel: string,
  restOfCommand: string[],
  context: ContextWithConversation,
  mentionTs: string,
  client: WebClient,
) => {
  const { conversation } = context;

  if (conversation.excluded) {
    for (const userId of getAllUserIdsInMessage(restOfCommand)) {
      conversation.excluded.delete(userId);
    }

    await context.updateConversation(conversation);
  }

  await client.reactions.add({
    channel,
    timestamp: mentionTs,
    name: "ok_hand",
  });
};

export const listExcluded = async (
  say: SayFn,
  { conversation }: ContextWithConversation,
  mentionTs: string,
  client: WebClient,
) => {
  const { excluded } = conversation;

  if (excluded.size === 0) {
    return sayInThread(say, mentionTs, [
      getSimpleTextBlock("No excluded users"),
    ]);
  }

  const namePromises: Promise<string | undefined>[] = Array.from(excluded).map(
    (user: string) =>
      client.users
        .info({ user })
        .then(({ user }) => user?.profile?.display_name),
  );
  let names = await Promise.all(namePromises);

  await sayInThread(say, mentionTs, [
    getSimpleTextBlock(`Excluded users: ${names.filter(Boolean).join(", ")}`),
  ]);
};
