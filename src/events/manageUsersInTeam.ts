import {
  BlockAction,
  Middleware,
  SlackActionMiddlewareArgs,
  SlackViewMiddlewareArgs,
} from "@slack/bolt/dist/types";
import { doesContextHaveConversation } from "../../types";
import { throwUnexpectedError } from "../clients-and-helpers/errorHandler";
import { ManageUsersButtonPayload } from "./teams";
import { ViewSubmitAction } from "@slack/bolt/dist/types/view";
import store from "../clients-and-helpers/dbClient";

const MANAGE_USER_BLOCK_ID = "MANAGE_USER_BLOCK_ID";
const MANAGE_USER_SELECT_ACTION_ID = "MANAGE_USER_SELECT_ACTION_ID";

type ManageUsersModalSubmissionPayload = {
  teamId: string;
  conversationId: string;
};

export const manageUsersInTeam: Middleware<
  SlackActionMiddlewareArgs<BlockAction>
> = async ({ ack, body, say, context, client }) => {
  console.log(context);
  await ack();

  if (!body.message) {
    console.error("No message in body", body);
    return;
  }

  if (!body.channel) {
    console.error("No channel in body", body);
    return;
  }

  const action = body.actions[0];
  const channel = body.channel.id;
  const pickMessageTs = body.message.ts;

  if (action.type !== "button") {
    return throwUnexpectedError(client, channel, pickMessageTs);
  }

  if (!doesContextHaveConversation(context)) {
    return throwUnexpectedError(client, channel, body.message.ts);
  }

  const { teamId } = JSON.parse(action.value) as ManageUsersButtonPayload;
  const members = context.conversation.teams[teamId]?.members ?? new Set();

  const payload: ManageUsersModalSubmissionPayload = {
    teamId,
    conversationId: channel,
  };

  await client.views.open({
    trigger_id: body.trigger_id,
    // View payload
    view: {
      type: "modal",
      // View identifier
      callback_id: "manage_users_modal_submission",
      title: {
        type: "plain_text",
        text: "Manage Team",
      },
      private_metadata: JSON.stringify(payload),
      blocks: [
        {
          type: "input",
          block_id: MANAGE_USER_BLOCK_ID,
          element: {
            type: "multi_users_select",
            action_id: MANAGE_USER_SELECT_ACTION_ID,
            initial_users: Array.from(members),
            focus_on_load: true,
            placeholder: {
              type: "plain_text",
              text: "Select users",
              emoji: true,
            },
          },
          label: {
            type: "plain_text",
            text: `Users on "${teamId}"`,
            emoji: true,
          },
        },
      ],
      submit: {
        type: "plain_text",
        text: "Submit",
      },
    },
  });
};

export const manageUsersModalSubmission: Middleware<
  SlackViewMiddlewareArgs<ViewSubmitAction>
> = async ({ ack, view, context }) => {
  const users =
    view.state.values[MANAGE_USER_BLOCK_ID][MANAGE_USER_SELECT_ACTION_ID]
      ?.selected_users;

  const { teamId, conversationId } = JSON.parse(
    view.private_metadata,
  ) as ManageUsersModalSubmissionPayload;
  // TODO handle teamName error

  if (!users?.length) {
    return ack({
      response_action: "errors",
      errors: {
        [MANAGE_USER_BLOCK_ID]: "Please select at least one user",
      },
    });
  }

  // TODO handle users not in channel

  const conversation = await store.get(conversationId);
  conversation.teams[teamId].members = new Set(users);
  await store.set(conversationId, conversation);

  await ack();
};
