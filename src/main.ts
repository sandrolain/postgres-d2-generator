import knex from "knex";
import { listTables } from "./listTables";
import * as fs from "fs";

const db = knex({
  client: "pg",
  connection: {
    host: "127.0.0.1",
    port: 5432,
    user: "postgres",
    password: "postgres",
    database: "demo",
  },
});


(async () => {
  const d2: string[] = [];
  const tables = await listTables(db);
  console.log("🚀 ~ file: main.ts:17 ~ tables:", tables)
  for(const table of tables) {
    d2.push(`${table}.shape: sql_table`);

    // {
    //   const res = await db.raw(
    //     `SELECT *
    //     FROM pg_indexes
    //     WHERE tablename = '${table}';
    //   `);
    //   for(const row of res.rows) {
    //   console.log("🚀 ~ file: main.ts:31 ~ row:", row)
    //   }
    // }

    let pkeys: any[] = [];
    let fkeys: any[] = [];

    {
      const res = await db.raw(
        `SELECT c.column_name, c.data_type
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
        JOIN information_schema.columns AS c ON c.table_schema = tc.constraint_schema
          AND tc.table_name = c.table_name AND ccu.column_name = c.column_name
        WHERE constraint_type = 'PRIMARY KEY' and tc.table_name = '${table}';
      `);
      pkeys = res.rows
    }

    {
      const res = await db.raw(
        `SELECT tc.table_schema,
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='${table}';
      `);
      fkeys = res.rows
    }

    const res = await db.raw(
      `SELECT *
      FROM information_schema.columns
      WHERE table_name = '${table}';
    `);

    for(const row of res.rows) {
      const colPkeys = pkeys.filter((item) => item.column_name == row.column_name)
      const colFkeys = fkeys.filter((item) => item.column_name == row.column_name);

      let constraint: string = "";
      if (colPkeys.length > 0) {
        constraint = "primary_key";
      } else if (colFkeys.length > 0) {
        constraint = "foreign_key";
      }

      const d2row = `${table}.${row.column_name}: ${row.data_type}${constraint.length ? ` { constraint: ${constraint} }` : ""}`;
      console.log(d2row)
      d2.push(d2row);

      for(const fkey of colFkeys) {
        const d2row = `${table}.${row.column_name} -> ${fkey.foreign_table_name}.${fkey.foreign_column_name}`;
        console.log(d2row)
        d2.push(d2row);
      }
    }




  }

  fs.writeFileSync("diagram.d2", d2.join("\n"));
  process.exit(0);
})().catch((e) => console.error(e));
