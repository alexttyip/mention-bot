require("dotenv").config();

const { App } = require("@slack/bolt");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  // Socket Mode doesn't listen on a port, but in case you want your app to respond to OAuth,
  // you still need to listen on some port!
  port: process.env.PORT || 3000,
});

const getGenerateInteger = async (min, max, n = 1) => {
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

  const json = await res.json();

  if (json.error) {
    throw json.error;
  }

  return json.result.random.data[0];
};

const pickUser = async (say, channel, triggeringUser, message) => {
  const members = await app.client.conversations
    .members({ channel })
    .then((obj) => obj.members);

  const infoPromises = members.map((member) =>
    app.client.users
      .info({
        user: member,
      })
      .then((info) => ({
        user: info.user.id,
        isBot: info.user.is_bot,
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
            text: `<@${pickedUser.user}> you've been picked by <@${triggeringUser}>: *${message}*`,
          },
          accessory: {
            type: "button",
            text: {
              type: "plain_text",
              text: ":recycle: Re-roll",
              emoji: true,
            },
            value: message,
            action_id: "re_roll_button_click",
          },
        },
      ],
      text: "Back-up text",
    });
  } catch (error) {
    console.error(error);
  }
};

const throwError = async (say) => {
  try {
    await say({
      text: "Oi use me properly",
    });
  } catch (error) {
    console.error(error);
  }
};

// subscribe to 'app_mention' event in your App config
// need app_mentions:read and chat:write scopes
app.event("app_mention", async ({ event, say, context }) => {
  const { botUserId } = context;

  const message = event.text;

  if (!message.startsWith(`<@${botUserId}>`)) {
    return throwError(say);
  }

  const firstSpaceIdx = message.indexOf(" ");

  if (firstSpaceIdx === -1) {
    return throwError(say);
  }

  await pickUser(
    say,
    event.channel,
    event.user,
    message.slice(firstSpaceIdx).trim(),
  );
});

app.action("re_roll_button_click", async ({ ack, body, say }) => {
  // Acknowledge the action
  await ack();

  const channel = body.channel.id;
  const message = body.actions[0].value;
  const originalMessageTimestamp = body.message.ts;
  const originalBlock = body.message.blocks[0];

  await app.client.chat.update({
    channel,
    ts: originalMessageTimestamp,
    blocks: [
      {
        ...originalBlock,
        text: {
          type: "mrkdwn",
          text: `:no-cross: ~${originalBlock.text.text}~ :no-cross:`,
        },
        accessory: undefined,
      },
    ],
  });

  await pickUser(say, channel, body.user.id, message);
});

(async () => {
  // Start your app
  await app.start();

  console.log("⚡️ Bolt app is running!");
})();
