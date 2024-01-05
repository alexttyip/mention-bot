import "dotenv/config";
import { App, Context, MemoryStore, SayFn } from "@slack/bolt";
import { getGenerateInteger } from "./randomNumberClient";
import { StringIndexed } from "@slack/bolt/dist/types/helpers";

const store = new MemoryStore();

// console.log("conversation: ", context.conversation);
// context.updateConversation((context.conversation ?? "") + "1");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  convoStore: store,
});

const replyWithChosenUser = (
  say: SayFn,
  userId: string,
  threadTs?: string,
  ts?: string,
) =>
  say({
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<@${userId}> you're up!`,
        },
        accessory: {
          type: "button",
          text: {
            type: "plain_text",
            text: ":recycle: Re-roll",
            emoji: true,
          },
          value: ts,
          action_id: "re_roll_button_click",
        },
      },
    ],
    thread_ts: threadTs ?? ts,
    text: "Back-up text",
  });

const pickUser = async (
  userIds: string[],
  triggeringUser: string | undefined,
) => {
  const eligibleUsers = userIds.filter((userId) => userId !== triggeringUser);
  const randomNumber = await getGenerateInteger(0, eligibleUsers.length - 1);
  return eligibleUsers[randomNumber];
};

const getAllUserIdsInChannel = async (channel: string) => {
  const members =
    (await app.client.conversations
      .members({ channel })
      .then((obj) => obj.members)) ?? [];

  const infoPromises = members.map((member) =>
    app.client.users
      .info({
        user: member,
      })
      .then(({ user }) => user),
  );

  let infos = await Promise.all(infoPromises);

  // Exclude bots and undefined users
  return infos.reduce((acc: string[], user) => {
    if (!user) {
      return acc;
    }

    const { id, is_bot } = user;

    if (!is_bot && id) {
      acc.push(id);
    }

    return acc;
  }, []);
};

const throwError = async (say: SayFn) => {
  try {
    await say({
      text: "Oi use me properly",
    });
  } catch (error) {
    console.error(error);
  }
};

const pick = async (
  say: SayFn,
  triggeringUser: string | undefined,
  channel: string,
  restOfCommand: string[],
  messageTs: string,
) => {
  const flagIdx = restOfCommand.findIndex((word) => word === "-t");
  const team =
    flagIdx !== -1 ? restOfCommand.slice(flagIdx + 1).join(" ") : undefined;

  let userIds: string[] = [];
  if (!team) {
    userIds = await getAllUserIdsInChannel(channel);
  } else {
    // TODO pick from team
  }

  const pickedUser = await pickUser(userIds, triggeringUser);

  await replyWithChosenUser(say, pickedUser, undefined, messageTs);
};

const handleMention = async ({
  event,
  say,
  context,
}: {
  event: {
    text: string;
    channel: string;
    ts: string;
    thread_ts?: string;
    user?: string;
  };
  say: SayFn;
  context: Context & StringIndexed;
}) => {
  const { botUserId } = context;

  const { text: message, channel, ts, thread_ts, user } = event;

  const [prefix, cmd, ...rest] = message.split(" ");

  if (prefix !== `<@${botUserId}>`) {
    return throwError(say);
  }

  if (!cmd) {
    return throwError(say);
  }

  switch (cmd) {
    case "pick":
      await pick(say, user, channel, rest, ts); // TODO does this handle mentions in threads?
      break;
    // case "include":
    //   throw "TODO include user into picks";
    // case "exclude":
    //   throw "TODO";
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
app.event("app_mention", ({ event, say, context }) => {
  return handleMention({ event, say, context });
});

app.action("re_roll_button_click", async ({ ack, body, say, context }) => {
  // Acknowledge the action
  await ack();

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

  const { user: originalTriggerMessageUser, text: originalTriggerMessageText } =
    originalMentionMessage.messages[0];
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
  });
});

(async () => {
  // Start your app
  await app.start();

  console.log("⚡️ Bolt app is running!");
})();
