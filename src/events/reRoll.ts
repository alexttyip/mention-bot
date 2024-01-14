import {
  BlockAction,
  Middleware,
  SlackActionMiddlewareArgs,
} from "@slack/bolt/dist/types";
import {
  PickButtonPayload,
  throwError,
} from "../clients-and-helpers/sayHelpers";
import { doesContextHaveConversation } from "../../types";
import { getUsersAndPick } from "../actions/pick";

export const reRoll: Middleware<
  SlackActionMiddlewareArgs<BlockAction>
> = async ({ ack, body, say, context, client }) => {
  await ack();

  if (!doesContextHaveConversation(context)) {
    return throwError(say);
  }

  const action = body.actions[0];

  if (action.type !== "button" || !body.channel || !body.message) {
    return throwError(say);
  }

  const channel = body.channel.id;

  // TODO exclude originally picked user?
  const { mentionTs, triggeringUser, pickedUser } = JSON.parse(
    action.value,
  ) as PickButtonPayload;

  const oldPickMessageTs = body.message?.ts;

  // Hide re-roll button
  const originalBlock = body.message.blocks[0];
  await client.chat.update({
    channel,
    ts: oldPickMessageTs,
    blocks: [
      {
        ...originalBlock,
        accessory: undefined,
      },
    ],
  });

  // React to the old pick message with no-cross
  await client.reactions.add({
    channel,
    timestamp: oldPickMessageTs,
    name: "no-cross",
  });

  await getUsersAndPick(
    say,
    triggeringUser,
    channel,
    context.conversation.excluded,
    mentionTs,
    client,
    "", // TODO
  );
};
