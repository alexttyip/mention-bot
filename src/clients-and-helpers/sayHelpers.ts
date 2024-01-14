import { Button, SayFn } from "@slack/bolt";

export type PickButtonPayload = {
  triggerTs: string;
  triggerUser?: string;
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
  triggerUser: string | undefined,
  pickedUser: string,
  triggerTs: string,
) => {
  const payload: PickButtonPayload = {
    triggerTs,
    triggerUser,
    pickedUser,
  };

  return sayInThread(say, triggerTs, `<@${pickedUser}> you're up!`, {
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
