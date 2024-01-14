import "dotenv/config";
import { App, Context, SayFn } from "@slack/bolt";
import { StringIndexed } from "@slack/bolt/dist/types/helpers";
import { WebClient } from "@slack/web-api";
import { getRandomInteger } from "./clients-and-helpers/randomNumberClient";
import {
  replyWithChosenUser,
  sayInThread,
  throwError,
} from "./clients-and-helpers/sayHelpers";
import {
  getAllUserIdsInChannel,
  getAllUserIdsInMessage,
} from "./clients-and-helpers/userHelpers";
import {
  ConversationState,
  CosmosDbConvoStore,
} from "./clients-and-helpers/dbClient";

type ContextWithConversation = Context &
  StringIndexed & {
    conversation: ConversationState;
    updateConversation: (conversation: ConversationState) => Promise<void>;
  };

const store = new CosmosDbConvoStore();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  convoStore: store,
});

// TODO initiate with all users of the channel

const pickUser = async (
  userIds: string[],
  triggeringUser: string | undefined,
) => {
  const eligibleUsers = userIds.filter((userId) => userId !== triggeringUser);
  const randomNumber = await getRandomInteger(0, eligibleUsers.length - 1);
  return eligibleUsers[randomNumber];
};

const pick = async (
  say: SayFn,
  triggeringUser: string | undefined,
  channel: string,
  restOfCommand: string[],
  mentionTs: string,
  client: WebClient,
) => {
  const flagIdx = restOfCommand.findIndex((word) => word === "-t");
  const team =
    flagIdx !== -1 ? restOfCommand.slice(flagIdx + 1).join(" ") : undefined;

  let userIds: string[] = [];
  if (!team) {
    userIds = await getAllUserIdsInChannel(channel, client);
  } else {
    // TODO pick from team
  }

  const pickedUser = await pickUser(userIds, triggeringUser);

  await replyWithChosenUser(say, pickedUser, mentionTs);
};

const include = async (
  channel: string,
  restOfCommand: string[],
  context: ContextWithConversation,
  mentionTs: string,
) => {
  const { conversation } = context;

  for (const userId of getAllUserIdsInMessage(restOfCommand)) {
    conversation.included.add(userId);
  }

  await context.updateConversation(conversation);

  await app.client.reactions.add({
    channel,
    timestamp: mentionTs,
    name: "ok_hand",
  });
};

const exclude = async (
  channel: string,
  restOfCommand: string[],
  context: ContextWithConversation,
  mentionTs: string,
) => {
  const { conversation } = context;

  if (!conversation.included) {
    return app.client.reactions.add({
      channel,
      timestamp: mentionTs,
      name: "ok_hand",
    });
  }

  for (const userId of getAllUserIdsInMessage(restOfCommand)) {
    conversation.included.delete(userId);
  }

  await context.updateConversation(conversation);

  await app.client.reactions.add({
    channel,
    timestamp: mentionTs,
    name: "ok_hand",
  });
};

const list = async (
  say: SayFn,
  { conversation }: ContextWithConversation,
  mentionTs: string,
) => {
  const { included } = conversation;

  if (included.size === 0) {
    return sayInThread(
      say,
      mentionTs,
      "No users included in this channel yet.",
    );
  }

  const namePromises: Promise<string | undefined>[] = Array.from(included).map(
    (user: string) =>
      app.client.users
        .info({ user })
        .then(({ user }) => user?.profile?.display_name),
  );
  let names = await Promise.all(namePromises);

  await sayInThread(
    say,
    mentionTs,
    `Included users: ${names.filter(Boolean).join(", ")}`,
  );
};

const handleMention = async ({
  event,
  say,
  context,
  client,
}: {
  event: {
    text: string;
    channel: string;
    ts: string;
    thread_ts?: string;
    user?: string;
  };
  say: SayFn;
  context: ContextWithConversation;
  client: WebClient;
}) => {
  const { botUserId } = context;

  // Use thread_ts?
  const { text: message, channel, ts, user } = event;

  const [prefix, cmd, ...rest] = message.split(/\s+/);

  if (prefix !== `<@${botUserId}>`) {
    return throwError(say);
  }

  if (!cmd) {
    return throwError(say);
  }

  switch (cmd) {
    case "pick":
      await pick(say, user, channel, rest, ts, client); // TODO does this handle mentions in threads?
      break;
    case "include":
    case "i":
      await include(channel, rest, context, ts);
      break;
    case "exclude":
    case "rm":
      await exclude(channel, rest, context, ts);
      break;
    case "list":
    case "ls":
      await list(say, context, ts);
      break;
    // throw "TODO list users";
    // case "create":
    //   throw "TODO create list";
    // case "show":
    //   throw "TODO display list";
    // case "delete":
    //   throw "TODO delete list";
    // case "add":
    //   throw "TODO add users to list";
    // case "remove":
    //   throw "TODO remove users from list";
    // case "shuffle":
    //   throw "TODO shuffle users in a list";
    // case "stats":
    //   throw "TODO stats";
    default:
      return throwError(say);
  }
};

const doesContextHaveConversation = (
  context: Context & StringIndexed,
): context is ContextWithConversation => {
  return context.conversation && context.updateConversation;
};

app.event("app_mention", ({ event, say, context, client }) => {
  if (doesContextHaveConversation(context)) {
    return handleMention({ event, say, context, client });
  }

  return throwError(say);
});

app.action(
  "re_roll_button_click",
  async ({ ack, body, say, context, client }) => {
    // Acknowledge the action
    await ack();

    if (!doesContextHaveConversation(context)) {
      return throwError(say);
    }

    if (body.type !== "block_actions") {
      return throwError(say);
    }

    const action = body.actions[0];

    if (action.type !== "button" || !body.channel) {
      return throwError(say);
    }

    const channel = body.channel.id;

    const originalMentionTs = action.value;
    const originalMentionMessage = await app.client.conversations.history({
      channel,
      oldest: originalMentionTs,
      limit: 1,
      inclusive: true,
    });

    if (!originalMentionMessage.messages) {
      // TODO originalMentionMessage.messages is empty if the bot is mentioned in a thread
      throw "TODO handle mentions in thread";
    }

    const {
      user: originalTriggerMessageUser,
      text: originalTriggerMessageText,
    } = originalMentionMessage.messages[0];
    if (!originalTriggerMessageText) {
      return throwError(say);
    }

    // React to the old pick message with no-cross
    const oldPickMessageTs = body.message?.ts;
    await app.client.reactions.add({
      channel,
      timestamp: oldPickMessageTs,
      name: "no-cross",
    });

    return handleMention({
      event: {
        text: originalTriggerMessageText,
        channel,
        ts: originalMentionTs,
        user: originalTriggerMessageUser,
      },
      say,
      context,
      client,
    });
  },
);

(async () => {
  // Start your app
  await app.start();

  console.log("⚡️ Bolt app is running!");
})();
