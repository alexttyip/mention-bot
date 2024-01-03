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

// // Listens to incoming messages that contain "hello"
// app.message('hello', async ({ message, say }) => {
//     // say() sends a message to the channel where the event was triggered
//     await say({
//         blocks: [
//             {
//                 "type": "section",
//                 "text": {
//                     "type": "mrkdwn",
//                     "text": `Hey there <@${message.user}>!`
//                 },
//                 "accessory": {
//                     "type": "button",
//                     "text": {
//                         "type": "plain_text",
//                         "text": "Click Me"
//                     },
//                     "action_id": "button_click"
//                 }
//             }
//         ],
//         text: `Hey there <@${message.user}>!`
//     });
// });
//
// app.action('button_click', async ({ body, ack, say }) => {
//     // Acknowledge the action
//     await ack();
//     await say(`<@${body.user.id}> clicked the button`);
// });

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

  return json.result.random.data[0];
};

// subscribe to 'app_mention' event in your App config
// need app_mentions:read and chat:write scopes
app.event("app_mention", async ({ event, context, client, say }) => {
  const members = await app.client.conversations
    .members({
      channel: event.channel,
    })
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
  infos = infos.filter(({ user, isBot }) => !isBot && event.user !== user);

  const randomNumber = await getGenerateInteger(0, infos.length - 1);
  const pickedUser = infos[randomNumber];

  try {
    await say({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Thanks for the mention <@${event.user}>! Here's a random user <@${pickedUser.user}>`,
          },
          accessory: {
            type: "button",
            text: {
              type: "plain_text",
              text: "Button",
              emoji: true,
            },
            value: "click_me_123",
            action_id: "first_button",
          },
        },
      ],
      text: "Back-up text",
    });
  } catch (error) {
    console.error(error);
  }
});

(async () => {
  // Start your app
  await app.start();

  console.log("⚡️ Bolt app is running!");
})();
