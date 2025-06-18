import { neon } from "@neondatabase/serverless"

// Create a reusable SQL client
const sql = neon(
  "postgres://neondb_owner:npg_epBG9mqRuiV7@ep-jolly-brook-ab5fd13n-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require",
)

export { sql }
