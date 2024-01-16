import {
  CosmosClient,
  CosmosClientOptions,
  PartitionKeyKind,
} from "@azure/cosmos";
import { ConversationStore } from "@slack/bolt";
import {
  ConversationState,
  DbConversationState,
  DbTeam,
  Team,
} from "../../types";

const endpoint = process.env.DB_ENDPOINT;
const key = process.env.DB_KEY;

const databaseId = process.env.DB_ID ?? "";
const containerId = process.env.DB_CONTAINER_ID ?? "";
const partitionKey = { kind: PartitionKeyKind.Hash, paths: ["/id"] };

const mapConversationStateToDbConversationState = (
  conversationId: string,
  { excluded, teams }: ConversationState,
): DbConversationState => ({
  id: conversationId,
  excluded: Array.from(excluded),
  teams: Object.keys(teams).reduce(
    (acc: Record<string, DbTeam>, teamId) => ({
      ...acc,
      [teamId]: {
        displayName: teams[teamId].displayName,
        members: Array.from(teams[teamId].members),
      },
    }),
    {},
  ),
});

const mapDbConversationStateToConversationState = ({
  excluded,
  teams,
}: DbConversationState): ConversationState => ({
  excluded: new Set(excluded),
  teams: Object.keys(teams).reduce(
    (acc: Record<string, Team>, teamId) => ({
      ...acc,
      [teamId]: {
        displayName: teams[teamId].displayName,
        members: new Set(teams[teamId].members),
      },
    }),
    {},
  ),
});

class CosmosDbConvoStore implements ConversationStore<ConversationState> {
  private readonly client: CosmosClient;

  constructor() {
    this.client = new CosmosClient(CosmosDbConvoStore.getDbOption());

    void CosmosDbConvoStore.createDatabase(this.client)
      .then(() => CosmosDbConvoStore.createContainer(this.client))
      .then(() => console.log("💿 Connected to DB"));
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
      partitionKey: partitionKey,
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
      .items.query(querySpec)
      .fetchAll();

    if (results.length === 0) {
      return {
        excluded: new Set(),
        teams: {},
      };
    }

    return mapDbConversationStateToConversationState(results[0]);
  }

  async set(conversationId: string, value: ConversationState): Promise<any> {
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
