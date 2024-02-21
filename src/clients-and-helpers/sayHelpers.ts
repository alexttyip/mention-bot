import { SayFn } from "@slack/bolt";
import { Block, KnownBlock } from "@slack/types";
import { ContextWithConversation } from "../types";

export interface PickButtonPayload {
  triggerTs: string;
  triggerUser: string;
  pickedUser: string;
  teamId?: string;
}

export const getSimpleTextBlock = (message: string) => ({
  type: "section",
  text: {
    type: "mrkdwn",
    text: message,
  },
});

export const sayInThread = (
  say: SayFn,
  threadTs: string,
  // message: string,
  blocks?: (KnownBlock | Block)[],
  // accessory?: Button, // | Overflow | Datepicker | Timepicker | Select | MultiSelect | Actionable | ImageElement | RadioButtons | Checkboxes,
) =>
  say({
    blocks,
    thread_ts: threadTs,
    text: "Back-up text",
  });

export const replyWithChosenUser = async (
  say: SayFn,
  { conversation, updateConversation }: ContextWithConversation,
  triggerUser: string,
  pickedUser: string,
  triggerTs: string,
  teamId: string | undefined,
) => {
  const payload: PickButtonPayload = {
    triggerTs,
    triggerUser,
    pickedUser,
    teamId,
  };

  await sayInThread(say, triggerTs, [
    getSimpleTextBlock(`<@${pickedUser}> you're up!`),
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: ":recycle: Re-roll",
            emoji: true,
          },
          value: JSON.stringify(payload),
          action_id: "re_roll_button_click",
        },
      ],
    },
  ]);

  return updateConversation({
    ...conversation,
    history: conversation.history.concat([
      {
        triggerUser,
        pickedUser,
        timestamp: Date.now(),
      },
    ]),
  });
};
