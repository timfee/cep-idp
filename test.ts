import { readFileSync, existsSync } from 'fs';

function parseJSONC(content: string) {
  const noComments = content
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const noTrailingCommas = noComments.replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(noTrailingCommas);
}

function replaceVars(str: string, vars: Record<string, string>): string {
  return str.replace(/\{([^}]+)\}/g, (_, key) => vars[key] ?? '');
}

function replaceVarsInObj(obj: any, vars: Record<string, string>): any {
  if (typeof obj === 'string') return replaceVars(obj, vars);
  if (Array.isArray(obj)) return obj.map((v) => replaceVarsInObj(v, vars));
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, replaceVarsInObj(v, vars)])
    );
  }
  return obj;
}

interface Workflow {
  connections: Record<string, { base: string; auth?: string }>;
  endpoints: Record<string, { conn: string; method: string; path: string; qs?: Record<string, string>; payload?: any }>;
}

interface Config {
  [key: string]: string;
}

async function callEndpoint(name: string, vars: Record<string, string>, workflow: Workflow) {
  const ep = workflow.endpoints[name];
  if (!ep) throw new Error(`Unknown endpoint: ${name}`);
  const conn = workflow.connections[ep.conn];
  if (!conn) throw new Error(`Unknown connection: ${ep.conn}`);

  let url = conn.base + replaceVars(ep.path, vars);
  if (ep.qs) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(ep.qs)) {
      qs.set(k, replaceVars(v, vars));
    }
    url += `?${qs.toString()}`;
  }

  const headers: Record<string, string> = {};
  if (conn.auth) headers['Authorization'] = replaceVars(conn.auth, vars);
  if (ep.payload) headers['Content-Type'] = 'application/json';

  const body = ep.payload ? JSON.stringify(replaceVarsInObj(ep.payload, vars)) : undefined;
  console.log(`\n--- Calling ${name} ${ep.method} ${url}`);
  const res = await fetch(url, { method: ep.method, headers, body });
  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(text);
}

async function run() {
  const args = process.argv.slice(2);
  let configArgIndex = args.findIndex((a) => a === '--config' || a === '-c');
  if (configArgIndex !== -1) {
    const path = args[configArgIndex + 1];
    if (path) {
      process.env.CONFIG = path;
      args.splice(configArgIndex, 2);
    }
  } else if (args[0] && args[0].startsWith('--config=')) {
    const path = args[0].split('=')[1];
    process.env.CONFIG = path;
    args.shift();
  }

  const content = readFileSync('workflow.jsonc', 'utf8');
  const workflow = parseJSONC(content) as Workflow;

  const configPath = process.env.CONFIG || 'test.config.json';
  let fileVars: Config = {};
  if (existsSync(configPath)) {
    try {
      fileVars = JSON.parse(readFileSync(configPath, 'utf8')) as Config;
    } catch (err) {
      console.error(`Failed to parse ${configPath}`, err);
    }
  } else {
    console.warn(`${configPath} not found; using env vars only`);
  }

  const vars: Record<string, string> = {
    ...fileVars,
    googleAccessToken: process.env.GOOGLE_TOKEN ?? fileVars.googleAccessToken ?? '',
    azureAccessToken: process.env.AZURE_TOKEN ?? fileVars.azureAccessToken ?? '',
    customerId: process.env.CUSTOMER_ID ?? fileVars.customerId ?? '',
    domainName: process.env.DOMAIN_NAME ?? fileVars.domainName ?? '',
  };

  const names = args;
  const targets = names.length ? names : Object.keys(workflow.endpoints);
  for (const name of targets) {
    try {
      await callEndpoint(name, vars, workflow);
    } catch (err) {
      console.error(err);
    }
  }
}

run();
