/**
 * Generates docs/api/openapi.json from the Zod request-body schemas already
 * validating server/api/** endpoints — a single, reviewable source of truth
 * for endpoint contracts instead of hand-transcribing them into each
 * platform's own spec docs (see planning/iOS_SPEC_web-ios-parity-pass-
 * 2026-09-17.md, "OpenAPI / Shared-Contract Generation").
 *
 * v1 scope: request-body schemas only. Response schemas aren't formally
 * declared with Zod anywhere in this codebase yet (endpoints return inferred
 * TypeScript types) — that's a defer-able follow-up, not silently dropped, so
 * every generated operation gets a single neutral `default` response rather
 * than a guessed status code (this codebase's endpoints return 400, 422, and
 * others for a failed parse, inconsistently — asserting one would be wrong
 * for some of them).
 *
 * Discovery: an endpoint's request-body schema is found by locating its
 * `<symbol>.safeParse(...)` / `<symbol>.parse(...)` call and resolving where
 * `<symbol>` came from — either a local `(export )?const <symbol> = z...` in
 * the same file, or an `import { <symbol> } from "..."` (including this
 * codebase's shared `~/utils/validation/schemas` module). No zod-to-openapi/
 * zod-openapi dependency needed: zod 4 ships `z.toJSONSchema()` natively, and
 * OpenAPI 3.0's schema object is JSON-Schema-compatible, so that output drops
 * in directly. `io: "input"` is required — the default ("output") mode marks
 * defaulted properties as required, which is wrong for a request body (the
 * caller may omit them and get the default; only *output* structurally has
 * every field present).
 */
import {
  readdirSync,
  statSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
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

// The one shared validation module this codebase's endpoints import Zod
// schemas from, alongside declaring their own inline. Extend this list if a
// second shared module is introduced.
const KNOWN_SCHEMA_SOURCES = [
  'from "zod"',
  'from "~/utils/validation/schemas"',
];

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
 * segment. Returns the dynamic segment names (without brackets) alongside
 * the route, so the caller can emit matching OpenAPI path parameters.
 */
function routeFromFilePath(filePath: string): {
  method: string;
  path: string;
  params: string[];
} {
  const rel = relative(API_DIR, filePath).replace(/\\/g, "/");
  const match = rel.match(/^(.*?)\.(get|post|put|patch|delete)\.ts$/);
  if (!match) {
    throw new Error(`Cannot infer HTTP method from filename: ${rel}`);
  }
  const [, routePart, method] = match;
  const params: string[] = [];
  const segments = routePart
    .split("/")
    .filter((seg) => seg !== "index")
    .map((seg) => {
      const dynamic = seg.match(/^\[(\.\.\.)?(.+)\]$/);
      if (!dynamic) return seg;
      params.push(dynamic[2]);
      return `{${dynamic[2]}}`;
    });
  return {
    method: method.toUpperCase(),
    path: `/api/${segments.join("/")}`,
    params,
  };
}

/**
 * Resolves an import specifier relative to the importing file: `~/foo/bar`
 * against the repo root, `./foo`/`../foo` against the importing file's own
 * directory. Only these two forms occur in server/api's validation imports.
 */
function resolveImportPath(specifier: string, fromFile: string): string {
  const base = specifier.startsWith("~/")
    ? join(REPO_ROOT, specifier.slice(2))
    : join(dirname(fromFile), specifier);
  return base.endsWith(".ts") ? base : `${base}.ts`;
}

/**
 * Finds the schema module + export name backing a file's request-body
 * validation, by locating its `<symbol>.safeParse(`/`.parse(` call and then
 * resolving where `<symbol>` is actually declared — handles both an inline
 * `(export )?const <symbol> = z...` and an `import { <symbol> } from "..."`
 * (with optional `as` aliasing).
 */
function resolveSchemaLocation(
  filePath: string,
  source: string,
): { modulePath: string; exportName: string } | undefined {
  // Two call shapes exercise a request-body schema in this codebase:
  // `<symbol>.safeParse(...)`/`.parse(...)` directly, or the shared
  // `validateBody(event, <symbol>)` helper (server/utils/validation.ts).
  const parseCall =
    source.match(/(\w+)\.(?:safeParse|parse)\(/) ??
    source.match(/validateBody\(\s*\w+\s*,\s*(\w+)\s*\)/);
  if (!parseCall) return undefined;
  const symbol = parseCall[1];

  const localDecl = new RegExp(`(?:export )?const ${symbol} = z\\b`);
  if (localDecl.test(source)) {
    return { modulePath: filePath, exportName: symbol };
  }

  const importMatch = source.match(
    new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*"([^"]+)"`, "g"),
  );
  if (importMatch) {
    for (const stmt of importMatch) {
      const parsed = stmt.match(/import\s*\{([^}]*)\}\s*from\s*"([^"]+)"/);
      if (!parsed) continue;
      const [, bindings, specifier] = parsed;
      for (const binding of bindings.split(",")) {
        const aliasMatch = binding.trim().match(/^(\w+)(?:\s+as\s+(\w+))?$/);
        if (!aliasMatch) continue;
        const [, realName, alias] = aliasMatch;
        if ((alias ?? realName) === symbol) {
          return {
            modulePath: resolveImportPath(specifier, filePath),
            exportName: realName,
          };
        }
      }
    }
  }

  return undefined;
}

interface OperationEntry {
  method: string;
  path: string;
  params: string[];
  schemaName: string;
  jsonSchema: unknown;
}

async function collectOperations(): Promise<OperationEntry[]> {
  // Pre-filter by source text before dynamically importing anything: most
  // server/api files rely on Nuxt's auto-imported globals (defineEventHandler
  // etc.) with no explicit import, which only exist inside Nuxt's own build/
  // runtime context — importing one of those directly in plain Node crashes
  // at module-evaluation time. Scoping to files that reference a known
  // schema source avoids ever touching the (much larger) set that don't.
  const files = walk(API_DIR).filter((f) => {
    if (!f.endsWith(".ts")) return false;
    const text = readFileSync(f, "utf-8");
    return KNOWN_SCHEMA_SOURCES.some((marker) => text.includes(marker));
  });

  // Cache imported schema modules — several endpoints share the same
  // ~/utils/validation/schemas module, no need to re-import it per file.
  const moduleCache = new Map<string, Record<string, unknown>>();
  const operations: OperationEntry[] = [];

  for (const file of files) {
    const source = readFileSync(file, "utf-8");
    const location = resolveSchemaLocation(file, source);
    if (!location) continue;

    const cached = moduleCache.get(location.modulePath);
    const mod: Record<string, unknown> =
      cached ?? (await import(location.modulePath));
    if (!cached) moduleCache.set(location.modulePath, mod);
    const schema = mod[location.exportName];
    if (!(schema instanceof z.ZodType)) continue;

    const { method, path, params } = routeFromFilePath(file);
    operations.push({
      method,
      path,
      params,
      schemaName: location.exportName,
      jsonSchema: z.toJSONSchema(schema, {
        target: "openapi-3.0",
        io: "input",
      }),
    });
  }

  return operations.sort((a, b) =>
    a.path === b.path
      ? a.method.localeCompare(b.method)
      : a.path.localeCompare(b.path),
  );
}

async function main() {
  const operations = await collectOperations();

  const paths: Record<string, Record<string, unknown>> = {};
  for (const op of operations) {
    paths[op.path] ??= {};
    paths[op.path][op.method.toLowerCase()] = {
      operationId: `${op.method.toLowerCase()}${op.path.replace(/[/{}-]/g, "_")}`,
      ...(op.params.length > 0
        ? {
            parameters: op.params.map((name) => ({
              name,
              in: "path",
              required: true,
              schema: { type: "string" },
            })),
          }
        : {}),
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: op.jsonSchema,
          },
        },
      },
      responses: {
        default: {
          description:
            "Response shape not yet declared with Zod (out of scope for v1 — see file header). Consult the endpoint's own source for its actual status codes and response body.",
        },
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
