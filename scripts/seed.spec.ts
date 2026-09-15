import { it } from "vitest";
import { seedDatabase } from "./seed";

it("seeds the demo database", async () => {
  await seedDatabase();
});
