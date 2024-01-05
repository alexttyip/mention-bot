import "dotenv/config";
import { App, MemoryStore, SayFn } from "@slack/bolt";

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

const getGenerateInteger = async (min: number, max: number, n = 1) => {
  const body = {
    jsonrpc: "2.0",
    method: "generateIntegers",
    params: {
      apiKey: "4677204d-8290-4fa8-8c22-c4b4866e9021",
      n,
      min,
      max,
    },
    id: 69,
  };

  const res = await fetch("https://api.random.org/json-rpc/4/invoke", {
    method: "post",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

  const json = (await res.json()) as {
    result: { random: { data: number[] } };
    error?: { message: string };
  };

  if (json.error) {
    throw json.error;
  }

  return json.result.random.data[0];
};

const pickUser = async (
  say: SayFn,
  channel: string,
  ts: string | undefined,
  thread_ts: string | undefined,
  triggeringUser: string,
) => {
  const members =
    (await app.client.conversations
      .members({ channel })
      .then((obj) => obj.members)) ?? [];

  const infoPromises = members.map((member) =>
    app.client.users
      .info({
        user: member,
      })
      .then((info) => ({
        user: info.user?.id,
        isBot: info.user?.is_bot,
      })),
  );

  let infos = await Promise.all(infoPromises);
  // Exclude bots and the picker
  infos = infos.filter(({ user, isBot }) => !isBot && user !== triggeringUser);

  const randomNumber = await getGenerateInteger(0, infos.length - 1);
  const pickedUser = infos[randomNumber];

  try {
    await say({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `<@${pickedUser.user}> you're up!`,
          },
          accessory: {
            type: "button",
            text: {
              type: "plain_text",
              text: ":recycle: Re-roll",
              emoji: true,
            },
            action_id: "re_roll_button_click",
          },
        },
      ],
      thread_ts: thread_ts ?? ts,
      text: "Back-up text",
    });
  } catch (error) {
    console.error(error);
  }
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

app.event("app_mention", async ({ event, say, context }) => {
  const { botUserId } = context;

  const { text: message, channel, ts, thread_ts, user } = event;

  if (!message.startsWith(`<@${botUserId}>`)) {
    return throwError(say);
  }

  const firstSpaceIdx = message.indexOf(" ");

  if (firstSpaceIdx === -1) {
    return throwError(say);
  }

  if (!user) {
    return throwError(say);
  }

  await pickUser(say, channel, ts, thread_ts, user);
});

app.action("re_roll_button_click", async ({ ack, body, say }) => {
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
  const originalMessageTimestamp = body.message?.ts;
  const originalThreadTimestamp = body.message?.thread_ts as string | undefined;

  if (!originalMessageTimestamp) {
    return throwError(say);
  }

  await app.client.reactions.add({
    channel,
    timestamp: originalMessageTimestamp,
    name: "no-cross",
  });

  await pickUser(
    say,
    channel,
    originalMessageTimestamp,
    originalThreadTimestamp,
    body.user.id,
  );
});

(async () => {
  // Start your app
  await app.start();

  console.log("⚡️ Bolt app is running!");
})();
