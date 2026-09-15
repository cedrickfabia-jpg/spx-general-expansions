const path = require("node:path");
process.env.__NEXT_DEV_SERVER = "1";
process.env.NEXT_PRIVATE_WORKER = "1";
process.env.TURBOPACK ||= "1";
const { startServer } = require("next/dist/server/lib/start-server");
const port = Number(process.env.PORT || 3000);
startServer({
  dir: process.cwd(),
  port,
  isDev: true,
  hostname: "localhost",
  allowRetry: true,
  serverFastRefresh: true
})
  .then(() => console.log(`General Expansions dev server ready at http://localhost:${port}`))
  .catch((error) => {
    console.error("Failed to start dev server", error);
    process.exit(1);
  });
