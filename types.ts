import { Context } from "@slack/bolt";
import { StringIndexed } from "@slack/bolt/dist/types/helpers";

export type ConversationState = {
  excluded: Set<string>;
};

export type DbConversationState = {
  id: string;
  excluded: string[];
};

export type ContextWithConversation = Context &
  StringIndexed & {
    conversation: ConversationState;
    updateConversation: (conversation: ConversationState) => Promise<void>;
  };

export const doesContextHaveConversation = (
  context: Context & StringIndexed,
): context is ContextWithConversation => {
  return context.conversation && context.updateConversation;
};
