import { it } from "vitest";
import { runRetryNotifications } from "./retry-notifications";

it("runs the notification retry pass", async () => {
  await runRetryNotifications();
});
