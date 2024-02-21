import { Context } from "@slack/bolt";
import { StringIndexed } from "@slack/bolt/dist/types/helpers";

export interface Team {
  displayName: string;
  members: string[];
}

export interface DbTeam {
  displayName: string;
  members: string[];
}

export interface ConversationState {
  excluded: string[];
  teams: Record<string, Team>;
}

export interface DbConversationState {
  id: string;
  excluded: string[];
  teams: Record<string, DbTeam>;
}

export type ContextWithConversation = Context &
  StringIndexed & {
    conversation: ConversationState;
    updateConversation: (conversation: ConversationState) => Promise<void>;
  };

export const doesContextHaveConversation = (
  context: Context & StringIndexed,
): context is ContextWithConversation =>
  !!context.conversation && !!context.updateConversation;
