import "dotenv/config";
import { App, MemoryStore, SayFn } from "@slack/bolt";
import { getGenerateInteger } from "./randomNumberClient";

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
          action_id: "re_roll_button_click",
        },
      },
    ],
    thread_ts: threadTs ?? ts,
    text: "Back-up text",
  });

const pickUser = async (userIds: string[], triggeringUser: string) => {
  const eligibleUsers = userIds.filter((userId) => userId !== triggeringUser);
  const randomNumber = await getGenerateInteger(0, eligibleUsers.length - 1);
  return eligibleUsers[randomNumber];
};

// const pickUser = async (
//   say: SayFn,
//   channel: string,
//   ts: string | undefined,
//   thread_ts: string | undefined,
//   triggeringUser: string,
// ) => {
//   const members =
//     (await app.client.conversations
//       .members({ channel })
//       .then((obj) => obj.members)) ?? [];
//
//   const infoPromises = members.map((member) =>
//     app.client.users
//       .info({
//         user: member,
//       })
//       .then(({ user }) => user),
//   );
//
//   let infos = await Promise.all(infoPromises);
//
//   // Exclude bots and the picker
//   let eligibleUsers = infos.reduce((acc: string[], user) => {
//     if (!user) {
//       return acc;
//     }
//
//     const { id, is_bot } = user;
//
//     if (!is_bot && id && id !== triggeringUser) {
//       acc.push(id);
//     }
//
//     return acc;
//   }, []);
//
//   const randomNumber = await getGenerateInteger(0, infos.length - 1);
//   const pickedUser = eligibleUsers[randomNumber];
//
//   if (!pickedUser) {
//     return throwError(say);
//   }
//
//   await replyWithChosenUser(say, pickedUser, thread_ts, ts);
// };

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

  const pickedUSer = await pickUser(userIds, "triggeringUser");

  await replyWithChosenUser(say, pickedUSer, undefined, messageTs);
};

app.event("app_mention", async ({ event, say, context }) => {
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
      await pick(say, channel, rest, ts);
      break;
    // case "include":
    //   throw "TODO include user into picks";
    // case "exclude":
    //   throw "TODO";
    case "create":
      throw "TODO create list";
    case "show":
      throw "TODO display list";
    case "delete":
      throw "TODO delete list";
    case "add":
      throw "TODO add users to list";
    case "remove":
      throw "TODO remove users from list";
    case "shuffle":
      throw "TODO shuffle users in a list";
    case "stats":
      throw "TODO stats";
    default:
      return throwError(say);
  }

  // const firstSpaceIdx = message.indexOf(" ");
  //
  // if (firstSpaceIdx === -1) {
  //   return throwError(say);
  // }
  //
  // // TODO get first word and check if it's a command
  // const command = message.substring(0, firstSpaceIdx);

  // if (!user) {
  //   return throwError(say);
  // }
  //
  // await pickUser(say, channel, ts, thread_ts, user);
});

// app.action("re_roll_button_click", async ({ ack, body, say }) => {
//   // Acknowledge the action
//   await ack();
//
//   if (body.type !== "block_actions") {
//     return throwError(say);
//   }
//
//   const action = body.actions[0];
//
//   if (action.type !== "button" || !body.channel) {
//     return throwError(say);
//   }
//
//   const channel = body.channel.id;
//   const originalMessageTimestamp = body.message?.ts;
//   const originalThreadTimestamp = body.message?.thread_ts as string | undefined;
//
//   if (!originalMessageTimestamp) {
//     return throwError(say);
//   }
//
//   await app.client.reactions.add({
//     channel,
//     timestamp: originalMessageTimestamp,
//     name: "no-cross",
//   });
//
//   await pickUser(
//     say,
//     channel,
//     originalMessageTimestamp,
//     originalThreadTimestamp,
//     body.user.id,
//   );
// });

(async () => {
  // Start your app
  await app.start();

  console.log("⚡️ Bolt app is running!");
})();
