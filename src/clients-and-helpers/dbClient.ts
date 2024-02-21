import {
  CosmosClient,
  CosmosClientOptions,
  PartitionKeyKind,
} from "@azure/cosmos";
import { ConversationStore } from "@slack/bolt";
import { ConversationState, DbConversationState, DbTeam } from "../types";
import { uniq } from "lodash";

const endpoint = process.env.DB_ENDPOINT;
const key = process.env.DB_KEY;

const databaseId = process.env.DB_ID ?? "";
const containerId = process.env.DB_CONTAINER_ID ?? "";
const partitionKey = { kind: PartitionKeyKind.Hash, paths: ["/id"] };

const mapConversationStateToDbConversationState = (
  conversationId: string,
  { excluded, teams, history }: ConversationState,
): DbConversationState => ({
  id: conversationId,
  excluded: uniq(excluded),
  teams: Object.entries(teams).reduce(
    (acc: Record<string, DbTeam>, [teamId, { displayName, members }]) => ({
      ...acc,
      [teamId]: {
        displayName,
        members: uniq(members),
      },
    }),
    {},
  ),
  history,
});

const mapDbConversationStateToConversationState = ({
  excluded,
  teams,
  history = [],
}: DbConversationState): ConversationState => ({
  excluded,
  teams,
  history,
});

class CosmosDbConvoStore implements ConversationStore<ConversationState> {
  private readonly client: CosmosClient;

  constructor() {
    this.client = new CosmosClient(CosmosDbConvoStore.getDbOption());

    void CosmosDbConvoStore.createDatabase(this.client)
      .then(() => CosmosDbConvoStore.createContainer(this.client))
      .then(() => {
        console.log("💿 Connected to DB");
      });
  }

  private static getDbOption(): CosmosClientOptions {
    if (!endpoint) {
      throw new Error("Missing DB_ENDPOINT environment variable");
    }

    return {
      endpoint,
      key,
      userAgentSuffix: "CosmosDBJavascriptQuickstart",
    };
  }

  private static async createDatabase(client: CosmosClient) {
    return client.databases.createIfNotExists({
      id: databaseId,
    });
  }

  private static async createContainer(client: CosmosClient) {
    return client.database(databaseId).containers.createIfNotExists({
      id: containerId,
      partitionKey,
    });
  }

  // This is getting called twice for every mention
  // Whatever :shrug:
  async get(conversationId: string): Promise<ConversationState> {
    const querySpec = {
      query: "SELECT TOP 1 * FROM c WHERE c.id = @conversationId",
      parameters: [
        {
          name: "@conversationId",
          value: conversationId,
        },
      ],
    };

    const { resources: results } = await this.client
      .database(databaseId)
      .container(containerId)
      .items.query<DbConversationState>(querySpec)
      .fetchAll();

    const result = results[0];

    if (!result) {
      return {
        excluded: [],
        teams: {},
        history: [],
      };
    }

    return mapDbConversationStateToConversationState(result);
  }

  async set(conversationId: string, value: ConversationState) {
    return this.client
      .database(databaseId)
      .container(containerId)
      .items.upsert(
        mapConversationStateToDbConversationState(conversationId, value),
      );
  }
}

const store = new CosmosDbConvoStore();

export default store;
