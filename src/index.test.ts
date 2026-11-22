// Tests of the Worker (src/index.ts). NOR-388.
//
// They run on Node under Vitest, calling the Worker's exported `fetch` handler
// directly, as private source A's src/index.test.ts does
// (NOR-366). Node has the same Request, Response and URL globals the handler
// uses. Cloudflare's own Vitest integration was not used: its known-issues
// page says V8 coverage is not supported, and this repo's coverage bar is
// measured with V8 (vitest.config.ts).
//
// The D1 binding is a small fake that records every statement and answers
// from a function the test supplies, so each route's SQL, bound values and
// error handling are asserted without a database. These tests pin what the
// Worker does today; they change no behaviour.

import { describe, expect, test } from "vitest";
import worker from "./index";

type Env = Parameters<typeof worker.fetch>[1];

interface Call {
  readonly sql: string;
  readonly args: readonly unknown[];
  readonly op: "all" | "first";
}

type Answer = (call: Call) => unknown;

/** A fake D1 binding: `prepare(sql)[.bind(...)].all()` / `.first()`. */
function fakeDb(answer: Answer = () => ({ results: [] })) {
  const calls: Call[] = [];
  const statement = (sql: string, args: readonly unknown[]) => ({
    bind: (...next: unknown[]) => statement(sql, next),
    all: async () => {
      const call: Call = { sql, args, op: "all" };
      calls.push(call);
      return answer(call);
    },
    first: async () => {
      const call: Call = { sql, args, op: "first" };
      calls.push(call);
      return answer(call);
    },
  });
  const db = { prepare: (sql: string) => statement(sql, []) };
  // The fake implements only the calls the Worker makes (prepare, bind, all,
  // first); D1Database has more (batch, exec, dump, withSession), none
  // reachable from it. A structural fake of a platform binding is the
  // documented case for a double cast in AGENTS.md.
  return { db: db as unknown as D1Database, calls };
}

const TOKEN = "test-token-not-a-secret";
const BASE = "https://loam.example";
const CONV_ID = "0123abcd-0123-4abc-8def-0123456789ab";

function env(db: D1Database, token: string = TOKEN): Env {
  // ARCHIVES (R2) is bound in wrangler.jsonc.template but no route reads it.
  return { DB: db, ARCHIVES: {} as R2Bucket, AUTH_TOKEN: token };
}

function get(
  e: Env,
  pathAndQuery: string,
  headers: Record<string, string> = { authorization: `Bearer ${TOKEN}` },
): Promise<Response> {
  return worker.fetch(new Request(`${BASE}${pathAndQuery}`, { headers }), e);
}

async function body(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

describe("public routes", () => {
  test("/ serves the HTML UI without a token", async () => {
    const { db, calls } = fakeDb();
    const res = await get(env(db), "/", {});
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await res.text()).toContain("<title>Loam</title>");
    expect(calls).toHaveLength(0);
  });

  test("/healthz answers without a token and reads nothing", async () => {
    const { db, calls } = fakeDb();
    const res = await get(env(db), "/healthz", {});
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(await body(res)).toEqual({
      ok: true,
      name: "loam",
      note: "the soil holds",
    });
    expect(calls).toHaveLength(0);
  });
});

describe("auth", () => {
  test("no token: 401 and no query", async () => {
    const { db, calls } = fakeDb();
    const res = await get(env(db), "/stats", {});
    expect(res.status).toBe(401);
    expect(await body(res)).toEqual({ error: "unauthorized" });
    expect(calls).toHaveLength(0);
  });

  test("a wrong bearer token is refused", async () => {
    const { db } = fakeDb();
    const res = await get(env(db), "/sources", {
      authorization: "Bearer wrong",
    });
    expect(res.status).toBe(401);
  });

  test("the bearer prefix is case-insensitive", async () => {
    const { db } = fakeDb();
    const res = await get(env(db), "/sources", {
      authorization: `bEaReR   ${TOKEN}`,
    });
    expect(res.status).toBe(200);
  });

  test("the token is also accepted as ?token=", async () => {
    const { db } = fakeDb();
    const res = await get(env(db), `/sources?token=${TOKEN}`, {});
    expect(res.status).toBe(200);
  });

  test("an empty AUTH_TOKEN leaves the API open (dev/local only, as documented)", async () => {
    const { db } = fakeDb();
    const res = await get(env(db, ""), "/sources", {});
    expect(res.status).toBe(200);
  });
});

describe("GET /search", () => {
  test("missing q is a 400", async () => {
    const { db, calls } = fakeDb();
    const res = await get(env(db), "/search?q=%20%20");
    expect(res.status).toBe(400);
    expect(await body(res)).toEqual({ error: "missing q" });
    expect(calls).toHaveLength(0);
  });

  test("a plain query binds the query and the default limit", async () => {
    const rows = [{ message_id: "m1", snippet: "<mark>soil</mark>" }];
    const { db, calls } = fakeDb(() => ({ results: rows }));
    const res = await get(env(db), "/search?q=soil");
    expect(res.status).toBe(200);
    expect(await body(res)).toEqual({
      query: "soil",
      fallback_phrase_mode: false,
      filters: { source: null, from: null, to: null, limit: 25 },
      count: 1,
      results: rows,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].op).toBe("all");
    expect(calls[0].sql).toContain("WHERE messages_fts MATCH ?\n");
    expect(calls[0].args).toEqual(["soil", 25]);
  });

  test("source, from and to filters are bound in order; limit is capped at 100", async () => {
    const { db, calls } = fakeDb(() => ({ results: [] }));
    const res = await get(
      env(db),
      "/search?q=soil&source=claude&from=2026-01-01&to=2026-02-01&limit=500",
    );
    const b = await body(res);
    expect(b.filters).toEqual({
      source: "claude",
      from: "2026-01-01",
      to: "2026-02-01",
      limit: 100,
    });
    expect(b.count).toBe(0);
    expect(calls[0].sql).toContain(
      "messages_fts MATCH ? AND source = ? AND created_at >= ? AND created_at <= ?",
    );
    expect(calls[0].args).toEqual([
      "soil",
      "claude",
      "2026-01-01",
      "2026-02-01",
      100,
    ]);
  });

  test("a result with no rows array counts as 0", async () => {
    const { db } = fakeDb(() => ({}));
    const b = await body(await get(env(db), "/search?q=soil"));
    expect(b.count).toBe(0);
    expect(b.results).toBeUndefined();
  });

  test("an FTS error on a query with special characters retries it as a phrase", async () => {
    const { db, calls } = fakeDb((call) => {
      if (call.args[0] === "self-hosted") throw new Error("fts5: syntax");
      return { results: [{ message_id: "m2" }] };
    });
    const res = await get(env(db), "/search?q=self-hosted");
    expect(res.status).toBe(200);
    const b = await body(res);
    expect(b.fallback_phrase_mode).toBe(true);
    expect(b.count).toBe(1);
    expect(calls.map((c) => c.args[0])).toEqual([
      "self-hosted",
      '"self-hosted"',
    ]);
  });

  test("the phrase retry strips embedded double quotes", async () => {
    const { db, calls } = fakeDb((call) => {
      if (calls.length === 1) throw new Error(`bad ${String(call.args[0])}`);
      return { results: [] };
    });
    await get(env(db), `/search?q=${encodeURIComponent('say "hi"')}`);
    expect(calls[1].args[0]).toBe('"say hi"');
  });

  test("when the phrase retry fails too, the second error is returned", async () => {
    const { db } = fakeDb((call) => {
      throw new Error(`failed on ${String(call.args[0])}`);
    });
    const res = await get(env(db), "/search?q=a:b");
    expect(res.status).toBe(400);
    expect(await body(res)).toEqual({
      error: "fts query failed (raw + phrase)",
      detail: 'failed on "a:b"',
    });
  });

  test("an FTS error on a query without special characters is returned, no retry", async () => {
    const { db, calls } = fakeDb(() => {
      throw new Error("no such table");
    });
    const res = await get(env(db), "/search?q=soil");
    expect(res.status).toBe(400);
    expect(await body(res)).toEqual({
      error: "fts query failed",
      detail: "no such table",
    });
    expect(calls).toHaveLength(1);
  });
});

describe("GET /conversation/:id", () => {
  test("a known id returns the conversation and its messages in order", async () => {
    const conv = { id: CONV_ID, title: "t" };
    const msgs = [{ id: "m1", position: 0 }];
    const { db, calls } = fakeDb((call) =>
      call.op === "first" ? conv : { results: msgs },
    );
    const res = await get(env(db), `/conversation/${CONV_ID}`);
    expect(res.status).toBe(200);
    expect(await body(res)).toEqual({ conversation: conv, messages: msgs });
    expect(calls.map((c) => c.args)).toEqual([[CONV_ID], [CONV_ID]]);
    expect(calls[1].sql).toContain("ORDER BY position");
  });

  test("an unknown id is a 404 and messages are not read", async () => {
    const { db, calls } = fakeDb(() => null);
    const res = await get(env(db), `/conversation/${CONV_ID}`);
    expect(res.status).toBe(404);
    expect(await body(res)).toEqual({ error: "conversation not found" });
    expect(calls).toHaveLength(1);
  });

  test("an id that is not 36 hex-and-dash characters is not routed", async () => {
    const { db, calls } = fakeDb();
    const res = await get(env(db), "/conversation/not-an-id");
    expect(res.status).toBe(404);
    expect(await body(res)).toEqual({
      error: "not found",
      path: "/conversation/not-an-id",
    });
    expect(calls).toHaveLength(0);
  });
});

describe("GET /stats and /sources", () => {
  test("/stats returns totals, per source and per month", async () => {
    const totals = { conversations: 2, messages: 5, sources_count: 1 };
    const { db, calls } = fakeDb((call) => {
      if (call.op === "first") return totals;
      if (call.sql.includes("GROUP BY source"))
        return { results: [{ source: "claude" }] };
      return { results: [{ month: "2026-11" }] };
    });
    const res = await get(env(db), "/stats");
    expect(await body(res)).toEqual({
      totals,
      by_source: [{ source: "claude" }],
      by_month: [{ month: "2026-11" }],
    });
    expect(calls).toHaveLength(3);
  });

  test("/sources lists the source names", async () => {
    const { db } = fakeDb(() => ({
      results: [{ source: "chatgpt" }, { source: "claude" }],
    }));
    const res = await get(env(db), "/sources");
    expect(await body(res)).toEqual({ sources: ["chatgpt", "claude"] });
  });

  test("/sources with no rows array is an empty list", async () => {
    const { db } = fakeDb(() => ({}));
    const res = await get(env(db), "/sources");
    expect(await body(res)).toEqual({ sources: [] });
  });
});

test("an unknown authed path is a 404 naming the path", async () => {
  const { db } = fakeDb();
  const res = await get(env(db), "/nope");
  expect(res.status).toBe(404);
  expect(await body(res)).toEqual({ error: "not found", path: "/nope" });
});
