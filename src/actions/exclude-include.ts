import { ContextWithConversation } from "../types";
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

  conversation.excluded.push(...getAllUserIdsInMessage(restOfCommand));

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
  const allUserIdsInMessage = getAllUserIdsInMessage(restOfCommand);

  conversation.excluded = conversation.excluded.filter(
    (userId) => !allUserIdsInMessage.includes(userId),
  );

  await context.updateConversation(conversation);

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
): Promise<void> => {
  const { excluded } = conversation;

  if (excluded.length === 0) {
    return void sayInThread(say, mentionTs, [
      getSimpleTextBlock("No excluded users"),
    ]);
  }

  const namePromises: Promise<string | undefined>[] = Array.from(excluded).map(
    (user: string) =>
      client.users
        .info({ user })
        .then(({ user }) => user?.profile?.display_name),
  );
  const names = await Promise.all(namePromises);

  await sayInThread(say, mentionTs, [
    getSimpleTextBlock(`Excluded users: ${names.filter(Boolean).join(", ")}`),
  ]);
};
