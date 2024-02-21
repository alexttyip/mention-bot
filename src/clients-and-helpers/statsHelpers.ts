import { PickInstance } from "../types";
import { WebClient } from "@slack/web-api";

const mapCountByUserIdToCountByUserName = async (
  countByUserId: Record<string, number>,
  client: WebClient,
): Promise<{ userName: string; count: number }[]> =>
  Promise.all(
    Object.entries(countByUserId)
      .sort(([, a], [, b]) => b - a)
      .map(([user, count]) =>
        client.users.info({ user }).then(({ user }) => {
          const userName = user?.profile?.display_name;

          if (!userName) {
            return undefined;
          }

          return {
            userName,
            count,
          };
        }),
      ),
  ).then((stats) =>
    stats.filter((stat): stat is { userName: string; count: number } =>
      Boolean(stat),
    ),
  );

export const calculateUserTriggerCount = async (
  history: PickInstance[],
  client: WebClient,
): Promise<
  {
    userName: string;
    count: number;
  }[]
> => {
  const userTriggerCount: Record<string, number> = {};

  history.forEach((pick) => {
    if (userTriggerCount[pick.triggerUser]) {
      userTriggerCount[pick.triggerUser]++;
    } else {
      userTriggerCount[pick.triggerUser] = 1;
    }
  });

  return mapCountByUserIdToCountByUserName(userTriggerCount, client);
};

export const calculateUserPickedCount = async (
  history: PickInstance[],
  client: WebClient,
): Promise<
  {
    userName: string;
    count: number;
  }[]
> => {
  const userPickedCount: Record<string, number> = {};

  history.forEach((pick) => {
    if (userPickedCount[pick.pickedUser]) {
      userPickedCount[pick.pickedUser]++;
    } else {
      userPickedCount[pick.pickedUser] = 1;
    }
  });

  return mapCountByUserIdToCountByUserName(userPickedCount, client);
};
