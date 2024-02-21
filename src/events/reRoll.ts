import {
  BlockAction,
  Middleware,
  SlackActionMiddlewareArgs,
} from "@slack/bolt/dist/types";
import { PickButtonPayload } from "../clients-and-helpers/sayHelpers";
import { doesContextHaveConversation } from "../types";
import { getUsersAndPick } from "../actions/pick";
import { throwUnexpectedError } from "../clients-and-helpers/errorHandler";
import { SectionBlock } from "@slack/types/dist/block-kit/blocks";
import { Block } from "@slack/types";

const isSectionBlock = (block: unknown): block is SectionBlock =>
  block !== undefined && (block as Block).type === "section";

export const reRoll: Middleware<
  SlackActionMiddlewareArgs<BlockAction>
> = async ({ ack, body, say, context, client }) => {
  await ack();

  const action = body.actions[0];

  if (!body.channel) {
    console.error("No channel in body", body);
    return;
  }

  if (!body.message) {
    console.error("No message in body", body);
    return;
  }

  const channel = body.channel.id;
  const { ts: pickMessageTs, blocks } = body.message;

  if (!action || action.type !== "button") {
    return throwUnexpectedError(client, channel, pickMessageTs);
  }

  if (!doesContextHaveConversation(context)) {
    return throwUnexpectedError(client, channel, body.message.ts);
  }

  // TODO exclude originally picked user w/ pickedUser?
  const { triggerTs, triggerUser, teamId } = JSON.parse(
    action.value,
  ) as PickButtonPayload;

  // Hide re-roll button
  if (Array.isArray(blocks) && isSectionBlock(blocks[0])) {
    await client.chat.update({
      channel,
      ts: pickMessageTs,
      blocks: [
        {
          ...blocks[0],
          accessory: undefined,
        },
      ],
    });
  }

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
    context,
    triggerTs,
    client,
    teamId,
  );
};
