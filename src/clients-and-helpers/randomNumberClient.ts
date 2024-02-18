export const getRandomInteger = async (
  min: number,
  max: number,
  n = 1,
): Promise<number> => {
  const body = {
    jsonrpc: "2.0",
    method: "generateIntegers",
    params: {
      apiKey: "4677204d-8290-4fa8-8c22-c4b4866e9021",
      n,
      min,
      max,
    },
    id: 69,
  };

  const res = await fetch("https://api.random.org/json-rpc/4/invoke", {
    method: "post",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

  const json = (await res.json()) as {
    result: { random: { data: number[] } };
    error?: { message: string };
  };

  if (json.error) {
    throw new Error(json.error.message);
  }

  const data = json.result.random.data;
  if (data.length === 0) {
    throw new Error("No random numbers generated");
  }

  // Disabling rule since it's explicitly checked in the if statement
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return data[0]!;
};
