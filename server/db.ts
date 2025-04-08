import { drizzle } from "drizzle-orm/neon-serverless";
import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

// Initialize database connection
const sql = neon(process.env.DATABASE_URL!);
// @ts-ignore - Type definition issue with drizzle-orm and neon
export const db = drizzle(sql, { schema });