/**
 * Generates docs/api/openapi.json from the Zod request-body schemas already
 * validating server/api/** endpoints — a single, reviewable source of truth
 * for endpoint contracts instead of hand-transcribing them into each
 * platform's own spec docs (see planning/iOS_SPEC_web-ios-parity-pass-
 * 2026-09-17.md, "OpenAPI / Shared-Contract Generation").
 *
 * v1 scope: request-body schemas only. Response schemas aren't formally
 * declared with Zod anywhere in this codebase yet (endpoints return inferred
 * TypeScript types) — that's a defer-able follow-up, not silently dropped.
 *
 * Discovery convention: an endpoint opts in by exporting ITS OWN top-level
 * Zod schema (a `ZodType` instance) as a named export from its own file —
 * e.g. `export const inviteBodySchema = z.object({...})`. A file with more
 * than one exported ZodType (rare — one file has a nested schema alongside
 * its top-level one) must export the top-level request-body schema LAST, so
 * it wins when multiple are found. No zod-to-openapi/zod-openapi dependency
 * needed: zod 4 ships `z.toJSONSchema()` natively, and OpenAPI 3.1's schema
 * object is JSON-Schema-compatible, so that output drops in directly.
 */
import { readdirSync, statSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { z } from "zod";
import * as h3 from "h3";

// Nuxt auto-imports h3's own exports (defineEventHandler, readBody, etc.) into
// every server/api file with no explicit import statement. Endpoint files
// call defineEventHandler(...) at module top level — it just builds a handler
// object, never invokes it — so stubbing h3's real functions onto globalThis
// before dynamically importing those files is enough to satisfy them; nothing
// here ever executes an actual request.
Object.assign(globalThis, h3);

const REPO_ROOT = resolve(import.meta.dirname, "..");
const API_DIR = join(REPO_ROOT, "server/api");
const OUTPUT_PATH = join(REPO_ROOT, "docs/api/openapi.json");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith(".ts") ? [full] : [];
  });
}

/**
 * Nitro's file-based routing convention: `server/api/foo/[id]/bar.post.ts`
 * becomes `POST /api/foo/{id}/bar`. `index.<method>.ts` drops the `index`
 * segment.
 */
function routeFromFilePath(filePath: string): { method: string; path: string } {
  const rel = relative(API_DIR, filePath).replace(/\\/g, "/");
  const match = rel.match(
    /^(.*?)\.(get|post|put|patch|delete)\.ts$/,
  );
  if (!match) {
    throw new Error(`Cannot infer HTTP method from filename: ${rel}`);
  }
  const [, routePart, method] = match;
  const segments = routePart
    .split("/")
    .filter((seg) => seg !== "index")
    .map((seg) => {
      const dynamic = seg.match(/^\[(\.\.\.)?(.+)\]$/);
      return dynamic ? `{${dynamic[2]}}` : seg;
    });
  return { method: method.toUpperCase(), path: `/api/${segments.join("/")}` };
}

interface OperationEntry {
  method: string;
  path: string;
  schemaName: string;
  jsonSchema: unknown;
}

async function collectOperations(): Promise<OperationEntry[]> {
  // Pre-filter by source text before dynamically importing anything: most
  // server/api files rely on Nuxt's auto-imported globals (defineEventHandler
  // etc.) with no explicit import, which only exist inside Nuxt's own build/
  // runtime context — importing one of those directly in plain Node crashes
  // at module-evaluation time. Every endpoint that opts into this generator
  // explicitly `import { z } from "zod"`, so scoping to those files avoids
  // ever touching the (much larger) set of endpoints that don't.
  const files = walk(API_DIR).filter(
    (f) => f.endsWith(".ts") && readFileSync(f, "utf-8").includes('from "zod"'),
  );
  const operations: OperationEntry[] = [];

  for (const file of files) {
    const source = await import(file);
    let found: { name: string; schema: z.ZodType } | undefined;
    for (const [name, value] of Object.entries(source)) {
      if (value instanceof z.ZodType) {
        // Last exported ZodType wins — see file header re: nested schemas.
        found = { name, schema: value };
      }
    }
    if (!found) continue;

    const { method, path } = routeFromFilePath(file);
    operations.push({
      method,
      path,
      schemaName: found.name,
      jsonSchema: z.toJSONSchema(found.schema, { target: "openapi-3.0" }),
    });
  }

  return operations.sort((a, b) =>
    a.path === b.path ? a.method.localeCompare(b.method) : a.path.localeCompare(b.path),
  );
}

async function main() {
  const operations = await collectOperations();

  const paths: Record<string, Record<string, unknown>> = {};
  for (const op of operations) {
    paths[op.path] ??= {};
    paths[op.path][op.method.toLowerCase()] = {
      operationId: `${op.method.toLowerCase()}${op.path.replace(/[/{}-]/g, "_")}`,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: op.jsonSchema,
          },
        },
      },
      responses: {
        "200": { description: "Success (response schema not yet declared)" },
        "400": { description: "Invalid request body" },
      },
    };
  }

  const document = {
    openapi: "3.0.3",
    info: {
      title: "Recruiting Compass API — request-body contracts",
      version: "1.0.0",
      description:
        "Auto-generated from server/api/** Zod schemas. Request bodies only " +
        "(v1 scope) — see scripts/generate-openapi.ts. Do not hand-edit; " +
        "run `npm run generate:openapi` after changing an endpoint's schema.",
    },
    paths,
  };

  mkdirSync(join(REPO_ROOT, "docs/api"), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(document, null, 2) + "\n");
  console.log(
    `Wrote ${operations.length} operation(s) across ${Object.keys(paths).length} path(s) to ${relative(REPO_ROOT, OUTPUT_PATH)}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
