import { Button, SayFn } from "@slack/bolt";

export type PickButtonPayload = {
  mentionTs: string;
  triggeringUser?: string;
  pickedUser: string;
};

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
  triggeringUser: string | undefined,
  pickedUser: string,
  mentionTs: string,
) => {
  const payload: PickButtonPayload = {
    mentionTs,
    triggeringUser,
    pickedUser,
  };

  return sayInThread(say, mentionTs, `<@${pickedUser}> you're up!`, {
    type: "button",
    text: {
      type: "plain_text",
      text: ":recycle: Re-roll",
      emoji: true,
    },
    value: JSON.stringify(payload),
    action_id: "re_roll_button_click",
  });
};

export const throwError = async (say: SayFn) => {
  try {
    await say({
      text: "Oi use me properly",
    });
  } catch (error) {
    console.error(error);
  }
};
