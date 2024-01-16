import {
  BlockAction,
  Middleware,
  SlackActionMiddlewareArgs,
} from "@slack/bolt/dist/types";
import { PickButtonPayload } from "../clients-and-helpers/sayHelpers";
import { doesContextHaveConversation } from "../../types";
import { getUsersAndPick } from "../actions/pick";
import { throwUnexpectedError } from "../clients-and-helpers/errorHandler";

export const reRoll: Middleware<
  SlackActionMiddlewareArgs<BlockAction>
> = async ({ ack, body, say, context, client }) => {
  await ack();

  const action = body.actions[0];

  if (!body.channel) {
    console.error("No channel in body", body);
    return;
  }

  const channel = body.channel.id;

  if (!body.message) {
    console.error("No message in body", body);
    return;
  }

  const pickMessageTs = body.message.ts;

  if (action.type !== "button") {
    return throwUnexpectedError(client, channel, pickMessageTs);
  }

  if (!doesContextHaveConversation(context)) {
    return throwUnexpectedError(client, channel, body.message.ts);
  }

  // TODO exclude originally picked user?
  const { triggerTs, triggerUser, pickedUser, teamId } = JSON.parse(
    action.value,
  ) as PickButtonPayload;

  // Hide re-roll button
  const originalBlock = body.message.blocks[0];
  await client.chat.update({
    channel,
    ts: pickMessageTs,
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
    timestamp: pickMessageTs,
    name: "no-cross",
  });

  await getUsersAndPick(
    say,
    triggerUser,
    channel,
    context.conversation,
    triggerTs,
    client,
    teamId,
  );
};
