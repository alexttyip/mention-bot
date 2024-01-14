import { throwError } from "../clients-and-helpers/sayHelpers";
import { Middleware, SayFn, SlackEventMiddlewareArgs } from "@slack/bolt";
import {
  ContextWithConversation,
  doesContextHaveConversation,
} from "../../types";
import { WebClient } from "@slack/web-api";
import { pick } from "../actions/pick";
import { exclude, include, listExcluded } from "../actions/exclude-include";

type MentionParams = {
  event: {
    text: string;
    channel: string;
    ts: string;
    thread_ts?: string;
    user?: string;
  };
  say: SayFn;
  context: ContextWithConversation;
  client: WebClient;
};

const handleMention = async ({
  event,
  say,
  context,
  client,
}: MentionParams) => {
  const { botUserId } = context;

  const { text: message, channel, ts: mentionTs, user } = event;

  const [prefix, cmd, ...rest] = message.split(/\s+/);

  if (prefix !== `<@${botUserId}>`) {
    return throwError(say);
  }

  if (!cmd) {
    return throwError(say);
  }

  switch (cmd) {
    case "pick":
      await pick(say, user, channel, rest, context, mentionTs, client);
      break;
    case "exclude":
    case "rm":
      await exclude(channel, rest, context, mentionTs, client);
      break;
    case "include":
    case "i":
      await include(channel, rest, context, mentionTs, client);
      break;
    case "list-excluded":
    case "lse":
      await listExcluded(say, context, mentionTs, client);
      break;
    // case "create":
    //   throw "TODO create list";
    // case "show":
    //   throw "TODO display list";
    // case "delete":
    //   throw "TODO delete list";
    // case "add":
    //   throw "TODO add users to list";
    // case "remove":
    //   throw "TODO remove users from list";
    // case "shuffle":
    //   throw "TODO shuffle users in a list";
    // case "stats":
    //   throw "TODO stats";
    default:
      return throwError(say);
  }
};

export const mentionEvent: Middleware<
  SlackEventMiddlewareArgs<"app_mention">
> = ({ event, say, context, client }) => {
  if (doesContextHaveConversation(context)) {
    return handleMention({ event, say, context, client });
  }

  return throwError(say);
};
