import { createApp } from "./app";
import { config } from "./config";

const app = createApp();

app.listen(config.API_PORT, () => {
  console.log(`DentaQueue API listening on port ${config.API_PORT}`);
});
