import "dotenv/config";
import { pool } from "../src/db";
import { seedDemoTenant } from "../src/lib/seed-demo-tenant";

seedDemoTenant({
  requireAuthorization: true,
})
  .catch((error) => {
    console.error("");
    console.error("DEMO SEED FAILED");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
