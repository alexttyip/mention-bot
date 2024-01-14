import { Button, SayFn } from "@slack/bolt";

export const sayInThread = (
  say: SayFn,
  threadTs: string,
  message: string,
  accessory?: Button, // | Overflow | Datepicker | Timepicker | Select | MultiSelect | Actionable | ImageElement | RadioButtons | Checkboxes,
) =>
  say({
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: message,
        },
        accessory,
      },
    ],
    thread_ts: threadTs,
    text: "Back-up text",
  });

export const replyWithChosenUser = (
  say: SayFn,
  userId: string,
  mentionTs: string,
  // threadTs?: string,
) =>
  sayInThread(say, mentionTs, `<@${userId}> you're up!`, {
    type: "button",
    text: {
      type: "plain_text",
      text: ":recycle: Re-roll",
      emoji: true,
    },
    value: mentionTs,
    action_id: "re_roll_button_click",
  });

export const throwError = async (say: SayFn) => {
  try {
    await say({
      text: "Oi use me properly",
    });
  } catch (error) {
    console.error(error);
  }
};
