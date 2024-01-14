import "dotenv/config";
import { App } from "@slack/bolt";
import { CosmosDbConvoStore } from "./src/clients-and-helpers/dbClient";
import { mentionEvent } from "./src/events/mention";
import { reRoll } from "./src/events/reRoll";

const store = new CosmosDbConvoStore();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  convoStore: store,
});

app.event("app_mention", mentionEvent);
app.action("re_roll_button_click", reRoll);

(async () => {
  // Start your app
  await app.start();

  console.log("⚡️ Bolt app is running!");
})();
