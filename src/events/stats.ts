import { WebClient } from "@slack/web-api";
import { Block, KnownBlock } from "@slack/types";
import { throwUnexpectedError } from "../clients-and-helpers/errorHandler";
import {
  BlockAction,
  Middleware,
  SlackActionMiddlewareArgs,
} from "@slack/bolt/dist/types";
import { sayInThread } from "../clients-and-helpers/sayHelpers";
import { calculateUserTriggerCount } from "../clients-and-helpers/statsHelpers";
import { doesContextHaveConversation } from "../types";

interface StatsButtonPayload {
  mentionTs: string;
}

const getStatsBlocks = (
  payload: StatsButtonPayload,
): (KnownBlock | Block)[] => [
  {
    type: "section",
    text: {
      type: "plain_text",
      text: "What kind of stats would you like to see? :bar_chart:",
      emoji: true,
    },
  },
  {
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Count of user picking someone",
        },
        action_id: "stats_user_trigger_count_btn_click",
        value: JSON.stringify(payload),
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Count of getting picked",
        },
        action_id: "stats_user_picked_count_btn_click",
        value: JSON.stringify(payload),
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Picking to picked ratio",
          emoji: true,
        },
        action_id: "stats_picking_to_picked_ratio_btn_click",
        value: JSON.stringify(payload),
      },
    ],
  },
];

export const showStats = async (
  user: string | undefined,
  channel: string,
  mentionTs: string,
  client: WebClient,
) => {
  if (!user) {
    return throwUnexpectedError(client, channel, mentionTs);
  }

  return client.chat.postEphemeral({
    channel,
    user,
    blocks: getStatsBlocks({ mentionTs }),
  });
};

export const showUserTriggerCountStats: Middleware<
  SlackActionMiddlewareArgs<BlockAction>
> = async ({ ack, say, body, context, client }) => {
  await ack();

  const action = body.actions[0];

  if (!action || action.type !== "button") {
    // TODO well, shit
    return;
  }

  if (!doesContextHaveConversation(context)) {
    // TODO well, shit
    return;
  }

  const { mentionTs } = JSON.parse(action.value) as StatsButtonPayload;

  const stats = await calculateUserTriggerCount(
    context.conversation.history,
    client,
  );
  const formattedStats = stats.length
    ? stats.map(({ userName, count }) => `${userName}: ${count}`).join("\n")
    : "No stats yet";

  await sayInThread(say, mentionTs, [
    {
      type: "rich_text",
      elements: [
        {
          type: "rich_text_section",
          elements: [
            {
              type: "text",
              text: "Here's some stats on how many times each user has picked someone:",
            },
          ],
        },
        {
          type: "rich_text_preformatted",
          border: 0,
          elements: [
            {
              type: "text",
              text: formattedStats,
            },
          ],
        },
      ],
    },
  ]);
};
