import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

// Create a Neon client with the DATABASE_URL environment variable
const sql = neon(process.env.DATABASE_URL!);

// Create a drizzle ORM instance with the schema
export const db = drizzle(sql, { schema });

// Export the sql client for use in session store
export { sql };