import { WebClient } from "@slack/web-api";

export const throwUserError = (
  client: WebClient,
  channel: string,
  ts: string,
) => reactWithError(client, channel, ts, "user_error");

export const throwUnexpectedError = (
  client: WebClient,
  channel: string,
  ts: string,
) => reactWithError(client, channel, ts, "confusedparrot");

export const reactWithError = async (
  client: WebClient,
  channel: string,
  ts: string,
  react: string,
) => {
  // React to the old pick message with no-cross
  await client.reactions.add({
    channel,
    timestamp: ts,
    name: react,
  });
};
