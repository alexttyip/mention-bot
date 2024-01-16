import { Context } from "@slack/bolt";
import { StringIndexed } from "@slack/bolt/dist/types/helpers";

export type Team = {
  displayName: string;
  members: Set<string>;
};

export type DbTeam = {
  displayName: string;
  members: string[];
};

export type ConversationState = {
  excluded: Set<string>;
  teams: Record<string, Team>;
};

export type DbConversationState = {
  id: string;
  excluded: string[];
  teams: Record<string, DbTeam>;
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
