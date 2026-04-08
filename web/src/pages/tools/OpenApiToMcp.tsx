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

// ---------------------------------------------------------------------------
// OpenAPI parser
// ---------------------------------------------------------------------------

function resolveRef(root: Record<string, unknown>, ref: string): Record<string, unknown> | undefined {
  if (!ref.startsWith('#/')) return undefined;
  const parts = ref.slice(2).split('/');
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
    baseUrl = (doc.servers[0] as Record<string, unknown>).url as string || '';
  } else if (doc.host) {
    // Swagger 2.0
    const scheme = Array.isArray(doc.schemes) && doc.schemes.length > 0 ? doc.schemes[0] : 'https';
    const basePath = (doc.basePath as string) || '';
    baseUrl = `${scheme}://${doc.host}${basePath}`;
  }

  // Paths
  const paths = (doc.paths as Record<string, Record<string, unknown>>) || {};
  const endpoints: Endpoint[] = [];
  const httpMethods = ['get', 'post', 'put', 'delete', 'patch'];

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    for (const method of httpMethods) {
      const op = pathItem[method] as Record<string, unknown> | undefined;
      if (!op) continue;

      const parameters: ParamInfo[] = [];

      // Path-level parameters
      const pathParams = (pathItem.parameters as Array<Record<string, unknown>>) || [];
      const opParams = (op.parameters as Array<Record<string, unknown>>) || [];
      const allParams = [...pathParams, ...opParams];

      for (const rawParam of allParams) {
        const param = rawParam.$ref ? resolveRef(doc, rawParam.$ref as string) || rawParam : rawParam;
        if (param.in === 'path' || param.in === 'query' || param.in === 'header') {
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
      if (op.requestBody && typeof op.requestBody === 'object') {
        const body = op.requestBody as Record<string, unknown>;
        const content = body.content as Record<string, Record<string, unknown>> | undefined;
        if (content?.['application/json']?.schema) {
          requestBodySchema = resolveSchema(doc, content['application/json'].schema);
        }
      }
      // Swagger 2.0: body parameter
      for (const rawParam of allParams) {
        const param = rawParam.$ref ? resolveRef(doc, rawParam.$ref as string) || rawParam : rawParam;
        if (param.in === 'body' && param.schema) {
          requestBodySchema = resolveSchema(doc, param.schema);
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
    case 'integer': return 'z.number()';
    case 'number': return 'z.number()';
    case 'boolean': return 'z.boolean()';
    case 'array': return 'z.array(z.unknown())';
    case 'object': return 'z.record(z.unknown())';
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
  lines.push(`  name: "${serverName}",`);
  lines.push(`  version: "${spec.version}",`);
  lines.push(`});`);
  lines.push('');
  lines.push(`const BASE_URL = "${spec.baseUrl}";`);

  if (includeAuth) {
    lines.push('');
    lines.push('// Configure authentication headers as needed');
    lines.push('const AUTH_HEADERS: Record<string, string> = {');
    lines.push('  // "Authorization": `Bearer ${process.env.API_KEY}`,');
    lines.push('};');
  }

  lines.push('');

  for (const ep of spec.endpoints) {
    const name = ep.operationId || toolName(ep.method, ep.path);
    const desc = ep.summary || ep.description || `${ep.method.toUpperCase()} ${ep.path}`;

    // Build schema params
    const schemaEntries: string[] = [];
    const pathParams: ParamInfo[] = [];
    const queryParams: ParamInfo[] = [];
    const headerParams: ParamInfo[] = [];
    const allParamNames: string[] = [];

    for (const param of ep.parameters) {
      const zodType = openApiTypeToZod(param.type);
      let entry = `    ${param.name}: ${zodType}`;
      if (!param.required) entry += '.optional()';
      if (param.description) entry += `.describe("${param.description.replace(/"/g, '\\"')}")`;
      entry += ',';
      schemaEntries.push(entry);
      allParamNames.push(param.name);

      if (param.in === 'path') pathParams.push(param);
      else if (param.in === 'query') queryParams.push(param);
      else if (param.in === 'header') headerParams.push(param);
    }

    // Request body properties
    const bodyParamNames: string[] = [];
    if (ep.requestBodySchema) {
      const props = ep.requestBodySchema.properties as Record<string, Record<string, unknown>> | undefined;
      const requiredFields = (ep.requestBodySchema.required as string[]) || [];
      if (props) {
        for (const [propName, propSchema] of Object.entries(props)) {
          const propType = (propSchema.type as string) || 'string';
          const zodType = openApiTypeToZod(propType);
          const isRequired = requiredFields.includes(propName);
          let entry = `    ${propName}: ${zodType}`;
          if (!isRequired) entry += '.optional()';
          const propDesc = propSchema.description as string | undefined;
          if (propDesc) entry += `.describe("${propDesc.replace(/"/g, '\\"')}")`;
          entry += ',';
          schemaEntries.push(entry);
          allParamNames.push(propName);
          bodyParamNames.push(propName);
        }
      }
    }

    lines.push(`server.tool(`);
    lines.push(`  "${name}",`);
    lines.push(`  "${desc.replace(/"/g, '\\"')}",`);

    if (schemaEntries.length > 0) {
      lines.push(`  {`);
      for (const entry of schemaEntries) lines.push(entry);
      lines.push(`  },`);
    } else {
      lines.push(`  {},`);
    }

    // Handler
    if (allParamNames.length > 0) {
      lines.push(`  async ({ ${allParamNames.join(', ')} }) => {`);
    } else {
      lines.push(`  async () => {`);
    }

    // Build URL with path params
    let urlExpr = '`${BASE_URL}' + ep.path.replace(/\{([^}]+)\}/g, '${$1}') + '`';

    // Query string
    if (queryParams.length > 0) {
      lines.push(`    const params = new URLSearchParams();`);
      for (const qp of queryParams) {
        if (qp.required) {
          lines.push(`    params.set("${qp.name}", String(${qp.name}));`);
        } else {
          lines.push(`    if (${qp.name} !== undefined) params.set("${qp.name}", String(${qp.name}));`);
        }
      }
      urlExpr = `${urlExpr} + "?" + params.toString()`;
    }

    lines.push(`    const url = ${urlExpr};`);

    // Fetch options
    const fetchOpts: string[] = [];
    fetchOpts.push(`      method: "${ep.method.toUpperCase()}",`);

    const headerEntries: string[] = [];
    if (bodyParamNames.length > 0) headerEntries.push(`"Content-Type": "application/json"`);
    if (includeAuth) headerEntries.push(`...AUTH_HEADERS`);
    for (const hp of headerParams) headerEntries.push(`"${hp.name}": String(${hp.name})`);

    if (headerEntries.length > 0) {
      fetchOpts.push(`      headers: { ${headerEntries.join(', ')} },`);
    }

    if (bodyParamNames.length > 0) {
      fetchOpts.push(`      body: JSON.stringify({ ${bodyParamNames.join(', ')} }),`);
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
      lines.push(`      const data = await res.json();`);
      lines.push(`      return {`);
      lines.push(`        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],`);
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
      lines.push(`    const data = await res.json();`);
      lines.push(`    return {`);
      lines.push(`      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],`);
      lines.push(`    };`);
    }

    lines.push(`  }`);
    lines.push(`);`);
    lines.push('');
  }

  lines.push('const transport = new StdioServerTransport();');
  lines.push('await server.connect(transport);');
  lines.push('');

  return lines.join('\n');
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

  for (const ep of spec.endpoints) {
    const name = ep.operationId || toolName(ep.method, ep.path);
    const desc = ep.summary || ep.description || `${ep.method.toUpperCase()} ${ep.path}`;

    // Build function params
    const requiredParams: string[] = [];
    const optionalParams: string[] = [];
    const pathParams: ParamInfo[] = [];
    const queryParams: ParamInfo[] = [];
    const bodyParamNames: string[] = [];

    for (const param of ep.parameters) {
      const pyType = openApiTypeToPython(param.type);
      if (param.in === 'path') pathParams.push(param);
      else if (param.in === 'query') queryParams.push(param);

      if (param.required) {
        requiredParams.push(`${param.name}: ${pyType}`);
      } else {
        optionalParams.push(`${param.name}: ${pyType} | None = None`);
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
          bodyParamNames.push(propName);
          if (requiredFields.includes(propName)) {
            requiredParams.push(`${propName}: ${pyType}`);
          } else {
            optionalParams.push(`${propName}: ${pyType} | None = None`);
          }
        }
      }
    }

    const allParams = [...requiredParams, ...optionalParams];
    const paramStr = allParams.length > 0 ? allParams.join(', ') : '';

    lines.push('');
    lines.push('@mcp.tool()');
    lines.push(`async def ${name}(${paramStr}) -> str:`);
    lines.push(`    """${desc.replace(/"/g, '\\"')}"""`);
    lines.push('    import httpx');
    lines.push('');

    // Build URL
    let urlStr = ep.path;
    for (const pp of pathParams) {
      urlStr = urlStr.replace(`{${pp.name}}`, `{${pp.name}}`);
    }
    lines.push(`    url = f"{BASE_URL}${urlStr}"`);

    // Headers
    if (bodyParamNames.length > 0 || includeAuth) {
      const headerParts: string[] = [];
      if (bodyParamNames.length > 0) headerParts.push('"Content-Type": "application/json"');
      if (includeAuth) headerParts.push('**AUTH_HEADERS');
      lines.push(`    headers = {${headerParts.join(', ')}}`);
    }

    // Query params
    if (queryParams.length > 0) {
      lines.push(`    params = {}`);
      for (const qp of queryParams) {
        if (qp.required) {
          lines.push(`    params["${qp.name}"] = ${qp.name}`);
        } else {
          lines.push(`    if ${qp.name} is not None:`);
          lines.push(`        params["${qp.name}"] = ${qp.name}`);
        }
      }
    }

    // Body
    if (bodyParamNames.length > 0) {
      lines.push(`    json_body = {`);
      for (const bp of bodyParamNames) {
        lines.push(`        "${bp}": ${bp},`);
      }
      lines.push(`    }`);
      // Remove None values
      lines.push(`    json_body = {k: v for k, v in json_body.items() if v is not None}`);
    }

    // HTTP call
    if (includeErrorHandling) {
      lines.push('    try:');
      lines.push('        async with httpx.AsyncClient() as client:');
      const callArgs: string[] = [`url`];
      if (bodyParamNames.length > 0 || includeAuth) callArgs.push('headers=headers');
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
      if (bodyParamNames.length > 0 || includeAuth) callArgs.push('headers=headers');
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

  return lines.join('\n');
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
    const name = serverName.trim() || (spec ? slugify(spec.title) : 'mcp-server');
    downloadFile(`${name}-mcp-server.${ext}`, output, 'text/plain');
  };

  return (
    <>
      <PageHead
        title="OpenAPI to MCP Server Generator - BitesInByte Tools"
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
