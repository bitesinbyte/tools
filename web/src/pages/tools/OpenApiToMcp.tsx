import { useState, useMemo, useRef } from 'react';
import {
  Typography,
  Stack,
  Box,
  Grid,
  TextField,
  IconButton,
  Tooltip,
  Chip,
  Switch,
  FormControlLabel,
  ToggleButton,
  ToggleButtonGroup,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import ClearIcon from '@mui/icons-material/Clear';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DataObjectIcon from '@mui/icons-material/DataObject';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard, downloadFile, readFileAsText } from '../../utils/file';
import { CodeEditor } from '../../components/CodeEditor';
import yaml from 'js-yaml';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OutputLang = 'typescript' | 'python';

interface ParsedSpec {
  title: string;
  version: string;
  baseUrl: string;
  endpoints: Endpoint[];
}

interface Endpoint {
  method: string;
  path: string;
  operationId?: string;
  summary?: string;
  description?: string;
  parameters: ParamInfo[];
  requestBodySchema?: Record<string, unknown>;
  requestBodyRequired: boolean;
}

interface ParamInfo {
  name: string;
  in: string; // path | query | header
  required: boolean;
  description?: string;
  type: string; // string | integer | number | boolean | array | object
}

// ---------------------------------------------------------------------------
// Sample spec
// ---------------------------------------------------------------------------

const SAMPLE_SPEC = `openapi: "3.0.3"
info:
  title: Petstore
  version: "1.0.0"
servers:
  - url: https://petstore.example.com/v1
paths:
  /pets:
    get:
      summary: List all pets
      operationId: listPets
      parameters:
        - name: limit
          in: query
          required: false
          description: How many items to return
          schema:
            type: integer
      responses:
        "200":
          description: A list of pets
    post:
      summary: Create a pet
      operationId: createPet
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  description: Name of the pet
                tag:
                  type: string
                  description: Optional tag
              required:
                - name
      responses:
        "201":
          description: Pet created
  /pets/{petId}:
    get:
      summary: Get a pet by ID
      operationId: showPetById
      parameters:
        - name: petId
          in: path
          required: true
          description: The id of the pet to retrieve
          schema:
            type: string
      responses:
        "200":
          description: A single pet
    delete:
      summary: Delete a pet
      operationId: deletePet
      parameters:
        - name: petId
          in: path
          required: true
          description: The id of the pet to delete
          schema:
            type: string
      responses:
        "204":
          description: Pet deleted`;

// ---------------------------------------------------------------------------
// Helpers: slugify
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function toolName(method: string, path: string): string {
  const slug = path
    .replace(/\{([^}]+)\}/g, 'by_$1')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/(^_|_$)/g, '');
  return `${method}_${slug}`.toLowerCase();
}

function tsString(value: string): string {
  return JSON.stringify(value);
}

function safeIdentifier(value: string, fallback = 'value'): string {
  const identifier = value.replace(/[^A-Za-z0-9_]/g, '_').replace(/^(\d)/, '_$1');
  return identifier || fallback;
}

function safeToolName(value: string): string {
  return safeIdentifier(value, 'tool').toLowerCase();
}

const PYTHON_KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class',
  'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from',
  'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass',
  'raise', 'return', 'try', 'while', 'with', 'yield',
]);

function safePythonIdentifier(value: string, fallback = 'value'): string {
  const identifier = safeIdentifier(value, fallback);
  return PYTHON_KEYWORDS.has(identifier) ? `${identifier}_` : identifier;
}

function pythonString(value: string): string {
  return JSON.stringify(value).replace(/\u2028|\u2029/g, '');
}

// ---------------------------------------------------------------------------
// OpenAPI parser
// ---------------------------------------------------------------------------

function resolveRef(root: Record<string, unknown>, ref: string): Record<string, unknown> | undefined {
  if (!ref.startsWith('#/')) return undefined;
  const parts = ref.slice(2).split('/').map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
  let current: unknown = root;
  for (const part of parts) {
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current as Record<string, unknown> | undefined;
}

function resolveSchema(root: Record<string, unknown>, schema: unknown): Record<string, unknown> {
  if (!schema || typeof schema !== 'object') return {};
  const s = schema as Record<string, unknown>;
  if (s.$ref && typeof s.$ref === 'string') {
    const resolved = resolveRef(root, s.$ref);
    return resolved ? resolveSchema(root, resolved) : {};
  }
  if (Array.isArray(s.allOf)) {
    const members = s.allOf.map((member) => resolveSchema(root, member));
    const required = [...new Set(members.flatMap((member) => Array.isArray(member.required) ? member.required as string[] : []))];
    const properties = Object.assign({}, ...members.map((member) => (
      member.properties && typeof member.properties === 'object' ? member.properties : {}
    )));
    return { ...s, type: s.type || 'object', properties, required };
  }
  // Resolve nested property refs
  if (s.properties && typeof s.properties === 'object') {
    const props: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(s.properties as Record<string, unknown>)) {
      props[key] = resolveSchema(root, val);
    }
    return { ...s, properties: props };
  }
  if (s.items && typeof s.items === 'object') {
    return { ...s, items: resolveSchema(root, s.items) };
  }
  return s;
}

function extractParamType(param: Record<string, unknown>, root: Record<string, unknown>): string {
  if (param.schema && typeof param.schema === 'object') {
    const schema = resolveSchema(root, param.schema);
    return (schema.type as string) || 'string';
  }
  return (param.type as string) || 'string';
}

function parseOpenApiSpec(raw: string): { spec: ParsedSpec; error: string } {
  let doc: Record<string, unknown>;
  try {
    // Try JSON first, then YAML
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      doc = JSON.parse(trimmed);
    } else {
      doc = yaml.load(trimmed) as Record<string, unknown>;
    }
  } catch (e) {
    return { spec: { title: '', version: '', baseUrl: '', endpoints: [] }, error: `Parse error: ${(e as Error).message}` };
  }

  if (!doc || typeof doc !== 'object') {
    return { spec: { title: '', version: '', baseUrl: '', endpoints: [] }, error: 'Invalid spec: not an object' };
  }

  // Info
  const info = (doc.info as Record<string, unknown>) || {};
  const title = (info.title as string) || 'Untitled API';
  const version = (info.version as string) || '1.0.0';

  // Base URL
  let baseUrl = '';
  if (doc.servers && Array.isArray(doc.servers) && doc.servers.length > 0) {
    const server = doc.servers[0] as Record<string, unknown>;
    baseUrl = typeof server.url === 'string' ? server.url : '';
    const variables = server.variables && typeof server.variables === 'object'
      ? server.variables as Record<string, Record<string, unknown>>
      : {};
    baseUrl = baseUrl.replace(/\{([^}]+)\}/g, (placeholder, name) => {
      const defaultValue = variables[name]?.default;
      return defaultValue === undefined ? placeholder : String(defaultValue);
    });
  } else if (doc.host) {
    // Swagger 2.0
    const scheme = Array.isArray(doc.schemes) && doc.schemes.length > 0 ? doc.schemes[0] : 'https';
    const basePath = (doc.basePath as string) || '';
    baseUrl = `${scheme}://${doc.host}${basePath}`;
  }

  // Paths
  if (!doc.paths || typeof doc.paths !== 'object' || Array.isArray(doc.paths)) {
    return { spec: { title, version, baseUrl, endpoints: [] }, error: 'Invalid spec: paths must be an object' };
  }
  const paths = doc.paths as Record<string, Record<string, unknown>>;
  const endpoints: Endpoint[] = [];
  const httpMethods = ['get', 'post', 'put', 'delete', 'patch'];

  for (const [path, rawPathItem] of Object.entries(paths)) {
    if (!rawPathItem || typeof rawPathItem !== 'object') continue;
    const pathItem = rawPathItem.$ref
      ? resolveRef(doc, rawPathItem.$ref as string) || rawPathItem
      : rawPathItem;
    for (const method of httpMethods) {
      const op = pathItem[method] as Record<string, unknown> | undefined;
      if (!op) continue;

      const parameters: ParamInfo[] = [];

      // Path-level parameters
      const pathParams = Array.isArray(pathItem.parameters) ? pathItem.parameters as Array<Record<string, unknown>> : [];
      const opParams = Array.isArray(op.parameters) ? op.parameters as Array<Record<string, unknown>> : [];
      const mergedParams = new Map<string, Record<string, unknown>>();
      for (const rawParam of [...pathParams, ...opParams]) {
        const param = rawParam.$ref ? resolveRef(doc, rawParam.$ref as string) || rawParam : rawParam;
        mergedParams.set(`${String(param.in)}:${String(param.name)}`, param);
      }
      const allParams = [...mergedParams.values()];

      for (const param of allParams) {
        if (param.in === 'path' || param.in === 'query' || param.in === 'header') {
          if (typeof param.name !== 'string' || !param.name) continue;
          parameters.push({
            name: param.name as string,
            in: param.in as string,
            required: param.in === 'path' ? true : !!(param.required),
            description: (param.description as string) || '',
            type: extractParamType(param, doc),
          });
        }
      }

      // Request body
      let requestBodySchema: Record<string, unknown> | undefined;
      let requestBodyRequired = false;
      if (op.requestBody && typeof op.requestBody === 'object') {
        const rawBody = op.requestBody as Record<string, unknown>;
        const body = rawBody.$ref ? resolveRef(doc, rawBody.$ref as string) || rawBody : rawBody;
        requestBodyRequired = !!body.required;
        const content = body.content as Record<string, Record<string, unknown>> | undefined;
        const media = content?.['application/json'] || content?.['application/*+json'] || (content ? Object.values(content)[0] : undefined);
        if (media?.schema) {
          requestBodySchema = resolveSchema(doc, media.schema);
        }
      }
      // Swagger 2.0: body parameter
      for (const param of allParams) {
        if (param.in === 'body' && param.schema) {
          requestBodySchema = resolveSchema(doc, param.schema);
          requestBodyRequired = !!param.required;
        }
      }

      endpoints.push({
        method,
        path,
        operationId: op.operationId as string | undefined,
        summary: (op.summary as string) || '',
        description: (op.description as string) || '',
        parameters,
        requestBodySchema,
        requestBodyRequired,
      });
    }
  }

  if (endpoints.length === 0) {
    return { spec: { title, version, baseUrl, endpoints }, error: 'No endpoints found in spec' };
  }

  return { spec: { title, version, baseUrl, endpoints }, error: '' };
}

// ---------------------------------------------------------------------------
// Code generator: TypeScript MCP server
// ---------------------------------------------------------------------------

function openApiTypeToZod(type: string): string {
  switch (type) {
    case 'string': return 'z.string()';
    case 'integer': return 'z.number().int()';
    case 'number': return 'z.number()';
    case 'boolean': return 'z.boolean()';
    case 'array': return 'z.array(z.unknown())';
    case 'object': return 'z.record(z.string(), z.unknown())';
    default: return 'z.string()';
  }
}

function generateTypeScript(spec: ParsedSpec, serverName: string, includeAuth: boolean, includeErrorHandling: boolean): string {
  const lines: string[] = [];

  lines.push('import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";');
  lines.push('import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";');
  lines.push('import { z } from "zod";');
  lines.push('');
  lines.push(`const server = new McpServer({`);
  lines.push(`  name: ${tsString(serverName)},`);
  lines.push(`  version: ${tsString(spec.version)},`);
  lines.push(`});`);
  lines.push('');
  lines.push(`const BASE_URL = ${tsString(spec.baseUrl)};`);

  if (includeAuth) {
    lines.push('');
    lines.push('// Configure authentication headers as needed');
    lines.push('const AUTH_HEADERS: Record<string, string> = {');
    lines.push('  // "Authorization": `Bearer ${process.env.API_KEY}`,');
    lines.push('};');
  }

  lines.push('');

  const usedToolNames = new Map<string, number>();
  for (const ep of spec.endpoints) {
    const baseName = safeToolName(ep.operationId || toolName(ep.method, ep.path));
    const occurrence = (usedToolNames.get(baseName) ?? 0) + 1;
    usedToolNames.set(baseName, occurrence);
    const name = occurrence === 1 ? baseName : `${baseName}_${occurrence}`;
    const desc = ep.summary || ep.description || `${ep.method.toUpperCase()} ${ep.path}`;

    // Build schema params
    const schemaEntries: string[] = [];
    const pathParams: ParamInfo[] = [];
    const queryParams: ParamInfo[] = [];
    const headerParams: ParamInfo[] = [];
    const allParamNames: string[] = [];

    for (const param of ep.parameters) {
      const zodType = openApiTypeToZod(param.type);
      let entry = `    ${tsString(param.name)}: ${zodType}`;
      if (!param.required) entry += '.optional()';
      if (param.description) entry += `.describe(${tsString(param.description)})`;
      entry += ',';
      schemaEntries.push(entry);
      allParamNames.push(param.name);

      if (param.in === 'path') pathParams.push(param);
      else if (param.in === 'query') queryParams.push(param);
      else if (param.in === 'header') headerParams.push(param);
    }

    // Request body properties
    const bodyParamNames: Array<{ property: string; arg: string }> = [];
    if (ep.requestBodySchema) {
      const props = ep.requestBodySchema.properties as Record<string, Record<string, unknown>> | undefined;
      const requiredFields = (ep.requestBodySchema.required as string[]) || [];
      if (props) {
        for (const [propName, propSchema] of Object.entries(props)) {
          const propType = (propSchema.type as string) || 'string';
          const zodType = openApiTypeToZod(propType);
          const isRequired = ep.requestBodyRequired && requiredFields.includes(propName);
          let argName = allParamNames.includes(propName) ? `body_${propName}` : propName;
          while (allParamNames.includes(argName)) argName = `body_${argName}`;
          let entry = `    ${tsString(argName)}: ${zodType}`;
          if (!isRequired) entry += '.optional()';
          const propDesc = propSchema.description as string | undefined;
          if (propDesc) entry += `.describe(${tsString(propDesc)})`;
          entry += ',';
          schemaEntries.push(entry);
          allParamNames.push(argName);
          bodyParamNames.push({ property: propName, arg: argName });
        }
      } else {
        let argName = allParamNames.includes('body') ? 'request_body' : 'body';
        while (allParamNames.includes(argName)) argName = `request_${argName}`;
        const zodType = openApiTypeToZod((ep.requestBodySchema.type as string) || 'object');
        schemaEntries.push(`    ${tsString(argName)}: ${zodType}${ep.requestBodyRequired ? '' : '.optional()'},`);
        allParamNames.push(argName);
        bodyParamNames.push({ property: '', arg: argName });
      }
    }

    lines.push(`server.tool(`);
    lines.push(`  ${tsString(name)},`);
    lines.push(`  ${tsString(desc)},`);

    if (schemaEntries.length > 0) {
      lines.push(`  {`);
      for (const entry of schemaEntries) lines.push(entry);
      lines.push(`  },`);
    } else {
      lines.push(`  {},`);
    }

    // Handler
    if (allParamNames.length > 0) {
      lines.push(`  async (args) => {`);
    } else {
      lines.push(`  async () => {`);
    }

    // Build URL with path params
    let pathExpr = tsString(ep.path);
    for (const pathParam of pathParams) {
      pathExpr += `.replace(${tsString(`{${pathParam.name}}`)}, encodeURIComponent(String(args[${tsString(pathParam.name)}])))`;
    }
    let urlExpr = `BASE_URL + ${pathExpr}`;

    // Query string
    if (queryParams.length > 0) {
      lines.push(`    const params = new URLSearchParams();`);
      for (const qp of queryParams) {
        if (qp.required) {
          lines.push(`    params.set(${tsString(qp.name)}, String(args[${tsString(qp.name)}]));`);
        } else {
          lines.push(`    if (args[${tsString(qp.name)}] !== undefined) params.set(${tsString(qp.name)}, String(args[${tsString(qp.name)}]));`);
        }
      }
      urlExpr = `${urlExpr} + (params.size ? "?" + params.toString() : "")`;
    }

    lines.push(`    const url = ${urlExpr};`);

    // Fetch options
    const fetchOpts: string[] = [];
    fetchOpts.push(`      method: "${ep.method.toUpperCase()}",`);

    const headerEntries: string[] = [];
    if (bodyParamNames.length > 0) headerEntries.push(`"Content-Type": "application/json"`);
    if (includeAuth) headerEntries.push(`...AUTH_HEADERS`);
    for (const hp of headerParams) {
      if (hp.required) headerEntries.push(`${tsString(hp.name)}: String(args[${tsString(hp.name)}])`);
      else headerEntries.push(`...(args[${tsString(hp.name)}] === undefined ? {} : { ${tsString(hp.name)}: String(args[${tsString(hp.name)}]) })`);
    }

    if (headerEntries.length > 0) {
      fetchOpts.push(`      headers: { ${headerEntries.join(', ')} },`);
    }

    if (bodyParamNames.length > 0) {
      const bodyExpression = bodyParamNames.length === 1 && bodyParamNames[0].property === ''
        ? `args[${tsString(bodyParamNames[0].arg)}]`
        : `{ ${bodyParamNames.map(({ property, arg }) => `${tsString(property)}: args[${tsString(arg)}]`).join(', ')} }`;
      fetchOpts.push(`      body: JSON.stringify(${bodyExpression}),`);
    }

    if (includeErrorHandling) {
      lines.push(`    try {`);
      lines.push(`      const res = await fetch(url, {`);
      for (const opt of fetchOpts) lines.push(`  ${opt}`);
      lines.push(`      });`);
      lines.push(`      if (!res.ok) {`);
      lines.push(`        return {`);
      lines.push(`          content: [{ type: "text", text: \`Error: \${res.status} \${res.statusText}\` }],`);
      lines.push(`        };`);
      lines.push(`      }`);
      lines.push(`      const text = await res.text();`);
      lines.push(`      return {`);
      lines.push(`        content: [{ type: "text", text: text || \`HTTP \${res.status}\` }],`);
      lines.push(`      };`);
      lines.push(`    } catch (error) {`);
      lines.push(`      return {`);
      lines.push(`        content: [{ type: "text", text: \`Request failed: \${(error as Error).message}\` }],`);
      lines.push(`      };`);
      lines.push(`    }`);
    } else {
      lines.push(`    const res = await fetch(url, {`);
      for (const opt of fetchOpts) lines.push(opt);
      lines.push(`    });`);
      lines.push(`    const text = await res.text();`);
      lines.push(`    return {`);
      lines.push(`      content: [{ type: "text", text: text || \`HTTP \${res.status}\` }],`);
      lines.push(`    };`);
    }

    lines.push(`  }`);
    lines.push(`);`);
    lines.push('');
  }

  lines.push('const transport = new StdioServerTransport();');
  lines.push('await server.connect(transport);');
  lines.push('');

  return lines.filter((line) => !line.trimStart().startsWith('// "Authorization"')).join('\n');
}

// ---------------------------------------------------------------------------
// Code generator: Python MCP server
// ---------------------------------------------------------------------------

function openApiTypeToPython(type: string): string {
  switch (type) {
    case 'string': return 'str';
    case 'integer': return 'int';
    case 'number': return 'float';
    case 'boolean': return 'bool';
    case 'array': return 'list';
    case 'object': return 'dict';
    default: return 'str';
  }
}

function generatePython(spec: ParsedSpec, serverName: string, includeAuth: boolean, includeErrorHandling: boolean): string {
  const lines: string[] = [];

  lines.push('from mcp.server.fastmcp import FastMCP');
  lines.push('');
  lines.push(`mcp = FastMCP("${serverName}")`);
  lines.push('');
  lines.push(`BASE_URL = "${spec.baseUrl}"`);

  if (includeAuth) {
    lines.push('');
    lines.push('# Configure authentication headers as needed');
    lines.push('AUTH_HEADERS: dict[str, str] = {');
    lines.push('    # "Authorization": f"Bearer {os.environ[\'API_KEY\']}",');
    lines.push('}');
  }

  lines.push('');

  const usedToolNames = new Map<string, number>();
  for (const ep of spec.endpoints) {
    const baseName = safePythonIdentifier(safeToolName(ep.operationId || toolName(ep.method, ep.path)), 'tool');
    const occurrence = (usedToolNames.get(baseName) ?? 0) + 1;
    usedToolNames.set(baseName, occurrence);
    const name = occurrence === 1 ? baseName : `${baseName}_${occurrence}`;
    const desc = ep.summary || ep.description || `${ep.method.toUpperCase()} ${ep.path}`;

    // Build function params
    const requiredParams: string[] = [];
    const optionalParams: string[] = [];
    const pathParams: ParamInfo[] = [];
    const queryParams: ParamInfo[] = [];
    const headerParams: ParamInfo[] = [];
    const bodyParamNames: Array<{ property: string; variable: string }> = [];
    const paramVars = new Map<string, string>();
    const usedVars = new Set<string>();
    const variableFor = (rawName: string): string => {
      const existing = paramVars.get(rawName);
      if (existing) return existing;
      const base = safePythonIdentifier(rawName);
      let candidate = base;
      let suffix = 2;
      while (usedVars.has(candidate)) candidate = `${base}_${suffix++}`;
      usedVars.add(candidate);
      paramVars.set(rawName, candidate);
      return candidate;
    };

    for (const param of ep.parameters) {
      const pyType = openApiTypeToPython(param.type);
      const variable = variableFor(param.name);
      if (param.in === 'path') pathParams.push(param);
      else if (param.in === 'query') queryParams.push(param);
      else if (param.in === 'header') headerParams.push(param);

      if (param.required) {
        requiredParams.push(`${variable}: ${pyType}`);
      } else {
        optionalParams.push(`${variable}: ${pyType} | None = None`);
      }
    }

    // Request body properties
    if (ep.requestBodySchema) {
      const props = ep.requestBodySchema.properties as Record<string, Record<string, unknown>> | undefined;
      const requiredFields = (ep.requestBodySchema.required as string[]) || [];
      if (props) {
        for (const [propName, propSchema] of Object.entries(props)) {
          const propType = (propSchema.type as string) || 'string';
          const pyType = openApiTypeToPython(propType);
          const baseVariable = safePythonIdentifier(propName);
          const variable = usedVars.has(baseVariable) ? variableFor(`body_${propName}`) : variableFor(propName);
          bodyParamNames.push({ property: propName, variable });
          if (ep.requestBodyRequired && requiredFields.includes(propName)) {
            requiredParams.push(`${variable}: ${pyType}`);
          } else {
            optionalParams.push(`${variable}: ${pyType} | None = None`);
          }
        }
      } else {
        const variable = variableFor(usedVars.has('body') ? 'request_body' : 'body');
        bodyParamNames.push({ property: '', variable });
        const pyType = openApiTypeToPython((ep.requestBodySchema.type as string) || 'object');
        if (ep.requestBodyRequired) requiredParams.push(`${variable}: ${pyType}`);
        else optionalParams.push(`${variable}: ${pyType} | None = None`);
      }
    }

    const allParams = [...requiredParams, ...optionalParams];
    const paramStr = allParams.length > 0 ? allParams.join(', ') : '';

    lines.push('');
    lines.push('@mcp.tool()');
    lines.push(`async def ${name}(${paramStr}) -> str:`);
    lines.push(`    ${pythonString(desc)}`);
    lines.push('    import httpx');
    lines.push('    from urllib.parse import quote');
    lines.push('');

    // Build URL
    let urlExpr = pythonString(ep.path);
    for (const pp of pathParams) {
      urlExpr += `.replace(${pythonString(`{${pp.name}}`)}, quote(str(${variableFor(pp.name)}), safe=""))`;
    }
    lines.push(`    url = BASE_URL + ${urlExpr}`);

    // Headers
    if (bodyParamNames.length > 0 || includeAuth || headerParams.length > 0) {
      const headerParts: string[] = [];
      if (bodyParamNames.length > 0) headerParts.push('"Content-Type": "application/json"');
      if (includeAuth) headerParts.push('**AUTH_HEADERS');
      for (const hp of headerParams.filter((param) => param.required)) {
        headerParts.push(`${pythonString(hp.name)}: str(${variableFor(hp.name)})`);
      }
      lines.push(`    headers = {${headerParts.join(', ')}}`);
      for (const hp of headerParams.filter((param) => !param.required)) {
        lines.push(`    if ${variableFor(hp.name)} is not None:`);
        lines.push(`        headers[${pythonString(hp.name)}] = str(${variableFor(hp.name)})`);
      }
    }

    // Query params
    if (queryParams.length > 0) {
      lines.push(`    params = {}`);
      for (const qp of queryParams) {
        if (qp.required) {
          lines.push(`    params[${pythonString(qp.name)}] = ${variableFor(qp.name)}`);
        } else {
          lines.push(`    if ${variableFor(qp.name)} is not None:`);
          lines.push(`        params[${pythonString(qp.name)}] = ${variableFor(qp.name)}`);
        }
      }
    }

    // Body
    if (bodyParamNames.length > 0) {
      if (bodyParamNames.length === 1 && bodyParamNames[0].property === '') {
        lines.push(`    json_body = ${bodyParamNames[0].variable}`);
      } else {
        lines.push(`    json_body = {`);
        for (const bp of bodyParamNames) {
          lines.push(`        ${pythonString(bp.property)}: ${bp.variable},`);
        }
        lines.push(`    }`);
        lines.push(`    json_body = {k: v for k, v in json_body.items() if v is not None}`);
      }
    }

    // HTTP call
    if (includeErrorHandling) {
      lines.push('    try:');
      lines.push('        async with httpx.AsyncClient() as client:');
      const callArgs: string[] = [`url`];
      if (bodyParamNames.length > 0 || includeAuth || headerParams.length > 0) callArgs.push('headers=headers');
      if (queryParams.length > 0) callArgs.push('params=params');
      if (bodyParamNames.length > 0) callArgs.push('json=json_body');
      lines.push(`            resp = await client.${ep.method}(${callArgs.join(', ')})`);
      lines.push('            resp.raise_for_status()');
      lines.push('            return resp.text');
      lines.push('    except httpx.HTTPStatusError as e:');
      lines.push('        return f"Error: {e.response.status_code} {e.response.reason_phrase}"');
      lines.push('    except Exception as e:');
      lines.push('        return f"Request failed: {str(e)}"');
    } else {
      lines.push('    async with httpx.AsyncClient() as client:');
      const callArgs: string[] = [`url`];
      if (bodyParamNames.length > 0 || includeAuth || headerParams.length > 0) callArgs.push('headers=headers');
      if (queryParams.length > 0) callArgs.push('params=params');
      if (bodyParamNames.length > 0) callArgs.push('json=json_body');
      lines.push(`        resp = await client.${ep.method}(${callArgs.join(', ')})`);
      lines.push('        return resp.text');
    }
  }

  lines.push('');
  lines.push('');
  lines.push('mcp.run()');
  lines.push('');

  return lines.filter((line) => !line.trimStart().startsWith('# "Authorization"')).join('\n');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OpenApiToMcp() {
  const [input, setInput] = useState('');
  const [outputLang, setOutputLang] = useState<OutputLang>('typescript');
  const [serverName, setServerName] = useState('');
  const [includeAuth, setIncludeAuth] = useState(true);
  const [includeErrorHandling, setIncludeErrorHandling] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Parse and generate
  const { spec, parseError, output } = useMemo(() => {
    if (!input.trim()) return { spec: null, parseError: '', output: '' };
    const { spec: parsed, error } = parseOpenApiSpec(input);
    if (error) return { spec: null, parseError: error, output: '' };

    const name = serverName.trim() || slugify(parsed.title) || 'api-server';

    const code = outputLang === 'typescript'
      ? generateTypeScript(parsed, name, includeAuth, includeErrorHandling)
      : generatePython(parsed, name, includeAuth, includeErrorHandling);

    return { spec: parsed, parseError: '', output: code };
  }, [input, outputLang, serverName, includeAuth, includeErrorHandling]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(output);
    enqueueSnackbar(ok ? 'Copied MCP server code' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
    } catch {
      enqueueSnackbar('Failed to paste', { variant: 'error' });
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      setInput(text);
      enqueueSnackbar(`Loaded ${file.name}`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to read file', { variant: 'error' });
    }
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  const handleLoadSample = () => {
    setInput(SAMPLE_SPEC);
    enqueueSnackbar('Loaded sample Petstore spec', { variant: 'info' });
  };

  const handleDownload = () => {
    const ext = outputLang === 'typescript' ? 'ts' : 'py';
    const name = slugify(serverName.trim()) || (spec ? slugify(spec.title) : '') || 'mcp-server';
    const mime = outputLang === 'typescript' ? 'text/typescript' : 'text/x-python';
    downloadFile(`${name}-mcp-server.${ext}`, output, mime);
  };

  return (
    <>
      <PageHead
        title="OpenAPI to MCP Server Generator - Lamplit Labs Tools"
        description="Generate a complete MCP (Model Context Protocol) server from an OpenAPI or Swagger spec. Supports TypeScript and Python output."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>OpenAPI to MCP Server Generator</Typography>
          <Typography variant="body2" color="text.secondary">
            Paste an OpenAPI 3.x or Swagger 2.0 spec and generate a ready-to-run MCP server that exposes every endpoint as a tool.
          </Typography>
        </Box>

        {/* Configuration */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 2,
            p: 1.5,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
          }}
        >
          <ToggleButtonGroup
            size="small"
            exclusive
            value={outputLang}
            onChange={(_, v) => { if (v) setOutputLang(v); }}
          >
            <ToggleButton value="typescript">TypeScript</ToggleButton>
            <ToggleButton value="python">Python</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            size="small"
            label="Server Name"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            placeholder={spec ? slugify(spec.title) : 'api-server'}
            sx={{ width: 180 }}
            slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: '0.8125rem' } } }}
          />

          <FormControlLabel
            control={<Switch size="small" checked={includeAuth} onChange={(e) => setIncludeAuth(e.target.checked)} />}
            label={<Typography sx={{ fontSize: '0.8125rem' }}>Auth</Typography>}
          />
          <FormControlLabel
            control={<Switch size="small" checked={includeErrorHandling} onChange={(e) => setIncludeErrorHandling(e.target.checked)} />}
            label={<Typography sx={{ fontSize: '0.8125rem' }}>Error Handling</Typography>}
          />

          <Box sx={{ flexGrow: 1 }} />

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.yaml,.yml"
            hidden
            onChange={handleUpload}
          />
          <Tooltip title="Upload spec file">
            <IconButton size="small" onClick={() => fileInputRef.current?.click()} sx={{ color: 'text.secondary' }}>
              <UploadFileIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Paste from clipboard">
            <IconButton size="small" onClick={handlePaste} sx={{ color: 'text.secondary' }}>
              <ContentPasteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Load sample spec">
            <IconButton size="small" onClick={handleLoadSample} sx={{ color: 'text.secondary' }}>
              <DataObjectIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear">
            <IconButton size="small" onClick={() => setInput('')} disabled={!input} sx={{ color: 'text.secondary' }}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Status chips */}
        {parseError && (
          <Chip label={parseError} color="error" variant="outlined" size="small" sx={{ alignSelf: 'flex-start' }} />
        )}

        {spec && !parseError && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip label={`${spec.title} v${spec.version}`} color="success" variant="outlined" size="small" />
            {spec.baseUrl && <Chip label={spec.baseUrl} variant="outlined" size="small" sx={{ fontFamily: 'monospace' }} />}
            <Chip label={`${spec.endpoints.length} endpoint${spec.endpoints.length !== 1 ? 's' : ''}`} color="primary" variant="outlined" size="small" />
          </Box>
        )}

        {/* Editor panels */}
        <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              OpenAPI / Swagger Spec
            </Typography>
            <CodeEditor
              value={input}
              onChange={(v) => setInput(v)}
              language="yaml"
              height={520}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>
                Generated MCP Server ({outputLang === 'typescript' ? 'TypeScript' : 'Python'})
              </Typography>
              <Tooltip title="Copy">
                <IconButton size="small" onClick={handleCopy} disabled={!output} sx={{ color: 'text.secondary' }}>
                  <ContentCopyIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download">
                <IconButton size="small" onClick={handleDownload} disabled={!output} sx={{ color: 'text.secondary' }}>
                  <DownloadIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
            <CodeEditor
              value={output}
              language={outputLang === 'typescript' ? 'typescript' : 'python'}
              readOnly
              height={520}
            />
          </Grid>
        </Grid>
      </Stack>
    </>
  );
}
