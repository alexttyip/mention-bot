import {
  CosmosClient,
  CosmosClientOptions,
  PartitionKeyKind,
} from "@azure/cosmos";
import { ConversationStore } from "@slack/bolt";

const endpoint = process.env.DB_ENDPOINT;
const key = process.env.DB_KEY;

const databaseId = process.env.DB_ID ?? "";
const containerId = process.env.DB_CONTAINER_ID ?? "";
const partitionKey = { kind: PartitionKeyKind.Hash, paths: ["/id"] };

export type ConversationState = {
  included: Set<string>;
};

export type DbConversationState = {
  id: string;
  included: string[];
};

const mapConversationStateToDbConversationState = (
  conversationId: string,
  { included }: ConversationState,
): DbConversationState => ({
  id: conversationId,
  included: Array.from(included),
});

const mapDbConversationStateToConversationState = ({
  included,
}: DbConversationState): ConversationState => ({
  included: new Set(included),
});

export class CosmosDbConvoStore
  implements ConversationStore<ConversationState>
{
  private readonly client: CosmosClient;

  constructor() {
    this.client = new CosmosClient(CosmosDbConvoStore.getDbOption());

    void CosmosDbConvoStore.createDatabase(this.client)
      .then(() => CosmosDbConvoStore.createContainer(this.client))
      .then(() => console.log("Connected to DB"));
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
        included: new Set(),
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
