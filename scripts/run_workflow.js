#!/usr/bin/env node
/**
 * Runner for testing and validating workflow.json endpoints.
 *
 * Generates per-endpoint fixtures, an endpoint_mapping.json, test_execution_log.txt,
 * and fixes_applied.md (initially empty if no fixes detected).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { JSONPath } = require('jsonpath-plus');

// Paths
const WORKFLOW_PATH = path.resolve(__dirname, '../workflow.json');
const TOKEN_GOOGLE_PATH = path.resolve(__dirname, '../tokens/google_token.json');
const TOKEN_MICROSOFT_PATH = path.resolve(__dirname, '../tokens/microsoft_token.json');
const FIXES_MD_PATH = path.resolve(__dirname, '../app/__tests__/fixtures/fixes_applied.md');
const MAPPING_JSON_PATH = path.resolve(__dirname, '../app/__tests__/fixtures/endpoint_mapping.json');
const LOG_PATH = path.resolve(__dirname, '../app/__tests__/fixtures/test_execution_log.txt');

async function main() {
  const workflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, 'utf8'));
  const googleToken = JSON.parse(fs.readFileSync(TOKEN_GOOGLE_PATH, 'utf8'));
  const msToken = JSON.parse(fs.readFileSync(TOKEN_MICROSOFT_PATH, 'utf8'));

  // Initialize variables with defaults
  const variables = {};
  if (workflow.variables) {
    for (const [key, def] of Object.entries(workflow.variables)) {
      variables[key] = def.default != null ? def.default : undefined;
    }
  }
  // Allow overriding tenantId via environment variable
  if (process.env.TENANT_ID) {
    variables.tenantId = process.env.TENANT_ID;
  }
  // Support various OAuth token field names (access_token, token, accessToken)
  variables.googleAccessToken =
    googleToken.access_token || googleToken.token || googleToken.accessToken;
  variables.azureAccessToken =
    msToken.access_token || msToken.token || msToken.accessToken;

  const endpointMapping = {};
  const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });
  const fixes = [];

  for (const step of workflow.steps) {
    if (step.manual) {
      console.log(`Skipping manual step: ${step.name}`);
      continue;
    }
    // Determine actions: either 'actions' or 'verify' + 'execute'
    const actionsList = step.actions
      ? step.actions
      : [...(step.verify || []), ...(step.execute || [])];
    let lastCheckerFailed = false;
    for (const action of actionsList) {
      if (action.fallback && !lastCheckerFailed) {
        continue;
      }
      const ep = workflow.endpoints[action.use];
      if (!ep) throw new Error(`Unknown endpoint: ${action.use}`);
      const conn = workflow.connections[ep.conn];
      if (!conn) throw new Error(`Unknown connection: ${ep.conn}`);
      // Build URL
      const base = conn.base || '';
      const rawPath = templateString(ep.path, variables);
      const fullUrl = rawPath.startsWith('http') ? rawPath : `${base}${rawPath}`;
      // Query string: merge endpoint-level and action-level qs
      let urlWithQs = fullUrl;
      const mergedQs = { ...(ep.qs || {}), ...(action.qs || {}) };
      if (Object.keys(mergedQs).length) {
        const qsObj = templateObject(mergedQs, variables);
        const params = new URLSearchParams(qsObj).toString();
        urlWithQs += params ? `?${params}` : '';
      }
      // Headers
      const headers = {};
      if (conn.auth && conn.auth !== 'none') {
        headers['Authorization'] = templateString(conn.auth, variables);
      }
      if (ep.headers) {
        Object.assign(headers, templateObject(ep.headers, variables));
      }
      // Payload
      let body;
      if (action.payload) {
        body = JSON.stringify(templateObject(action.payload, variables));
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      }
      // Make request
      const start = new Date();
      let res, text, json;
      let fetchError = null;
      try {
        res = await fetch(urlWithQs, { method: ep.method, headers, body });
        text = await res.text();
        try {
          json = JSON.parse(text);
        } catch {
          json = text;
        }
      } catch (err) {
        fetchError = err;
        res = { status: 'ERROR', statusText: err.message };
        text = '';
        json = null;
      }
      const status = res.status;
      const elapsed = new Date() - start;
      // Log execution
      const logEntry = {
        timestamp: new Date().toISOString(),
        step: step.name,
        action: action.use,
        method: ep.method,
        url: urlWithQs,
        status,
        durationMs: elapsed,
        fallbackApplied: !!action.fallback && lastCheckerFailed,
      };
      logStream.write(JSON.stringify(logEntry) + '\n');
      // Write fixture
      const fixtureRelDir = getFixtureDir(ep.conn);
      const fixtureDir = path.resolve(__dirname, '../app/__tests__/fixtures', fixtureRelDir);
      fs.mkdirSync(fixtureDir, { recursive: true });
      const fixtureName = `${action.use.replace(/\./g, '_')}.${status}.json`;
      const fixturePath = path.join(fixtureDir, fixtureName);
      const headerComments = [];
      headerComments.push(`// ${ep.method} ${urlWithQs}`);
      if (fetchError) {
        headerComments.push(`// Error: ${fetchError.message}`);
      } else {
        headerComments.push(`// Status: ${status} ${res.statusText || ''}`);
        headerComments.push(`// Issues Fixed: None`);
      }
      const headerText = headerComments.join('\n');
      fs.writeFileSync(fixturePath, headerText + '\n' + JSON.stringify(json, null, 2));
      endpointMapping[action.use] = path.relative(
        path.resolve(__dirname, '../app/__tests__/fixtures'),
        fixturePath
      );
      // Checker (skip if fetchError)
      if (!fetchError) {
        if (!action.fallback) {
          if (action.checker) {
            const ok = runChecker(action.checker, action, json, variables);
            lastCheckerFailed = !ok;
          } else {
            lastCheckerFailed = false;
          }
        } else {
          lastCheckerFailed = false;
        }
        // Extract variables
        if (!lastCheckerFailed && action.extract) {
          for (const [varName, expr] of Object.entries(action.extract)) {
            if (typeof expr === 'string' && expr.startsWith('{') && expr.endsWith('}')) {
              variables[varName] = evaluateExpression(expr.slice(1, -1), variables);
            } else {
              const vals = JSONPath({ path: expr, json });
              variables[varName] = Array.isArray(vals) && vals.length === 1 ? vals[0] : vals;
            }
          }
        }
      } else {
        // mark fetch failure so fallback actions can run
        lastCheckerFailed = true;
      }
    }
  }
  // Write mapping and fixes
  fs.writeFileSync(MAPPING_JSON_PATH, JSON.stringify(endpointMapping, null, 2));
  fs.writeFileSync(FIXES_MD_PATH, fixes.join('\n') || '# Workflow Fixes Applied\n\n_None_\n');
  logStream.end();
}

function templateString(str, vars) {
  const s = str.trim();
  // Skip full-pass templating for JSON-like object literals to avoid parsing errors
  if (s.startsWith('{"')) {
    return str;
  }
  return str.replace(/{([^}]+)}/g, (_, expr) => String(evaluateExpression(expr, vars)));
}

function templateObject(obj, vars) {
  if (typeof obj === 'string') return templateString(obj, vars);
  if (Array.isArray(obj)) return obj.map(v => templateObject(v, vars));
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = templateObject(v, vars);
    }
    return out;
  }
  return obj;
}

/**
 * Evaluate a template expression in a sandbox of permitted helpers and variables.
 */
function evaluateExpression(expr, vars) {
  const sandbox = {
    ...vars,
    email: (user, domain) => `${user}@${domain}`,
    generateDeterministicPassword: deterministicPassword,
    url: (base, p) => `${base}/${p}`,
    concat: (a, b) => `${a}${b}`,
    extractCertificateFromXml: extractCertificate,
    split: (str, delim) => (typeof str === 'string' ? str.split(delim) : []),
  };
  const argNames = Object.keys(sandbox);
  const argValues = Object.values(sandbox);
  // eslint-disable-next-line no-new-func
  const fn = new Function(...argNames, `return (${expr});`);
  return fn(...argValues);
}

function deterministicPassword(domain) {
  const h = crypto.createHash('sha256').update(`${domain}-azuread-provisioning-2024`).digest('hex');
  return h.slice(0, 12) + '!Aa1';
}

function extractCertificate(xml) {
  if (typeof xml !== 'string') {
    return '';
  }
  const m = xml.match(/<X509Certificate>([^<]+)<\/X509Certificate>/);
  return m ? m[1] : '';
}

function runChecker(checker, action, json, vars) {
  if (checker === 'exists') {
    return json != null;
  }
  if (checker === 'fieldTruthy') {
    return !!json[action.field];
  }
  if (checker === 'eq') {
    const vals = JSONPath({ path: action.jsonPath, json });
    const actual = Array.isArray(vals) && vals.length === 1 ? vals[0] : vals;
    const expected = evaluateExpression(action.value.slice(1, -1), vars);
    return actual == expected;
  }
  return true;
}

function getFixtureDir(conn) {
  switch (conn) {
    case 'googleAdmin': return 'google/admin';
    case 'googleCI': return 'google/cloudidentity';
    case 'graphGA': return 'microsoft/graph';
    case 'graphBeta': return 'microsoft/graphBeta';
    default: return 'public';
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});