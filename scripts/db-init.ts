import { initializeDatabase } from "@/lib/db";
import { logger } from "@/lib/logger";

export function initDatabase(): void {
  initializeDatabase();
  logger.info("database initialized");
}
