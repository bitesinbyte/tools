import DataObjectIcon from '@mui/icons-material/DataObject';
import SchemaIcon from '@mui/icons-material/Schema';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import EnhancedEncryptionIcon from '@mui/icons-material/EnhancedEncryption';
import TableChartIcon from '@mui/icons-material/TableChart';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import TagIcon from '@mui/icons-material/Tag';
import ImageIcon from '@mui/icons-material/Image';
import PaletteIcon from '@mui/icons-material/Palette';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import NotesIcon from '@mui/icons-material/Notes';
import DescriptionIcon from '@mui/icons-material/Description';
import LinkIcon from '@mui/icons-material/Link';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import CodeIcon from '@mui/icons-material/Code';
import StorageIcon from '@mui/icons-material/Storage';
import TypeSpecimenIcon from '@mui/icons-material/TypeSpecimen';
import CalculateIcon from '@mui/icons-material/Calculate';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EditNoteIcon from '@mui/icons-material/EditNote';
import DifferenceIcon from '@mui/icons-material/Difference';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import CssIcon from '@mui/icons-material/Css';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import TranslateIcon from '@mui/icons-material/Translate';
import PatchesIcon from '@mui/icons-material/Difference';
import NumbersIcon from '@mui/icons-material/Numbers';
import SecurityIcon from '@mui/icons-material/Security';
import HttpIcon from '@mui/icons-material/Http';
import LanIcon from '@mui/icons-material/Lan';
import ViewTimelineIcon from '@mui/icons-material/ViewTimeline';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import type { SvgIconComponent } from '@mui/icons-material';

export type ToolCategory = 'All' | 'Data' | 'Text' | 'Encoding' | 'Web' | 'Dev' | 'AI';

export const CATEGORIES: ToolCategory[] = ['All', 'Data', 'Text', 'Encoding', 'Web', 'Dev', 'AI'];

export interface ToolInfo {
  title: string;
  description: string;
  href: string;
  icon: SvgIconComponent;
  priority: number;
  category: ToolCategory;
}

export const tools: ToolInfo[] = ([
  // ── Data ──
  {
    title: 'JSON Formatter & Validator',
    description: 'Format, minify, and validate JSON with real-time feedback, file upload, and download.',
    href: '/json-formatter',
    icon: DataObjectIcon,
    priority: 21,
    category: 'Data',
  },
  {
    title: 'JSON / YAML Converter',
    description: 'Bidirectional real-time conversion between JSON and YAML with auto-detection.',
    href: '/json-yaml',
    icon: SwapHorizIcon,
    priority: 20,
    category: 'Data',
  },
  {
    title: 'YAML Schema Validator',
    description: 'Validate YAML documents against JSON Schema definitions from schemastore.org.',
    href: '/yaml-validator',
    icon: SchemaIcon,
    priority: 19,
    category: 'Data',
  },
  {
    title: 'JSON to TypeScript',
    description: 'Convert JSON objects into TypeScript interfaces and types automatically.',
    href: '/json-to-typescript',
    icon: TypeSpecimenIcon,
    priority: 1,
    category: 'Data',
  },
  {
    title: 'CSV Delimiter Changer',
    description: 'Upload a CSV file, preview data, and convert delimiters with drag-and-drop.',
    href: '/csv-delimiter',
    icon: TableChartIcon,
    priority: 15,
    category: 'Data',
  },
  {
    title: 'JSON Path Evaluator',
    description: 'Evaluate JSONPath expressions against JSON data with live results and presets.',
    href: '/json-path',
    icon: AccountTreeOutlinedIcon,
    priority: 39,
    category: 'Data',
  },
  {
    title: 'SQL Formatter',
    description: 'Format and beautify SQL queries with support for multiple dialects.',
    href: '/sql-formatter',
    icon: StorageIcon,
    priority: 2,
    category: 'Data',
  },
  // ── Encoding ──
  {
    title: 'Encode / Decode',
    description: 'Real-time encoding and decoding in Base64, URL, HTML, and SHA-256.',
    href: '/encode-decode',
    icon: EnhancedEncryptionIcon,
    priority: 16,
    category: 'Encoding',
  },
  {
    title: 'JWT Decoder',
    description: 'Decode and inspect JWT headers, payloads, and claims with timestamp formatting.',
    href: '/jwt',
    icon: VpnKeyIcon,
    priority: 18,
    category: 'Encoding',
  },
  {
    title: 'Hash Generator',
    description: 'Compute MD5, SHA-1, SHA-256, SHA-384, and SHA-512 hashes for text and files.',
    href: '/hash',
    icon: TagIcon,
    priority: 12,
    category: 'Encoding',
  },
  {
    title: 'Base64 Image Encoder',
    description: 'Convert images to Base64 data URIs or decode Base64 strings back to images.',
    href: '/base64-image',
    icon: ImageIcon,
    priority: 11,
    category: 'Encoding',
  },
  {
    title: 'HTML Entity Encoder',
    description: 'Encode special characters to HTML entities or decode entities back to characters.',
    href: '/html-entities',
    icon: CodeIcon,
    priority: 3,
    category: 'Encoding',
  },
  {
    title: 'Base Converter',
    description: 'Convert numbers between binary, octal, decimal, and hexadecimal with BigInt support.',
    href: '/base-converter',
    icon: NumbersIcon,
    priority: 35,
    category: 'Encoding',
  },
  {
    title: 'UUID Generator',
    description: 'Generate UUIDs v4 (random) and v7 (time-ordered) with bulk generation support.',
    href: '/uuid',
    icon: FingerprintIcon,
    priority: 13,
    category: 'Encoding',
  },
  // ── Text ──
  {
    title: 'Text & File Compare',
    description: 'Compare two text inputs or uploaded files side-by-side with diff stats.',
    href: '/text-compare',
    icon: CompareArrowsIcon,
    priority: 17,
    category: 'Text',
  },
  {
    title: 'Regex Tester',
    description: 'Test regex patterns with live matching, capture groups, and common presets.',
    href: '/regex',
    icon: ManageSearchIcon,
    priority: 9,
    category: 'Text',
  },
  {
    title: 'Lorem Ipsum Generator',
    description: 'Generate placeholder text by words, sentences, or paragraphs.',
    href: '/lorem-ipsum',
    icon: NotesIcon,
    priority: 8,
    category: 'Text',
  },
  {
    title: 'Markdown Preview',
    description: 'Live Markdown editor with side-by-side HTML preview. Supports GFM.',
    href: '/markdown',
    icon: DescriptionIcon,
    priority: 7,
    category: 'Text',
  },
  {
    title: 'Diff to Patch Converter',
    description: 'Generate unified diffs from two texts or apply patch files to produce results.',
    href: '/diff-patch',
    icon: PatchesIcon,
    priority: 37,
    category: 'Text',
  },
  {
    title: 'CSS Minifier / Beautifier',
    description: 'Minify or beautify CSS with configurable indentation and size stats.',
    href: '/css-minifier',
    icon: CssIcon,
    priority: 40,
    category: 'Text',
  },
  // ── Web ──
  {
    title: 'URL Parser',
    description: 'Parse and breakdown URL components including protocol, host, path, and query params.',
    href: '/url-parser',
    icon: LinkIcon,
    priority: 6,
    category: 'Web',
  },
  {
    title: 'QR Code Generator',
    description: 'Generate QR codes from text or URLs with customizable size and PNG download.',
    href: '/qr-code',
    icon: QrCode2Icon,
    priority: 4,
    category: 'Web',
  },
  {
    title: 'Color Converter',
    description: 'Convert between HEX, RGB, HSL, and OKLCH color formats with a visual picker.',
    href: '/color-converter',
    icon: PaletteIcon,
    priority: 10,
    category: 'Web',
  },
  {
    title: 'HTTP Status Code Reference',
    description: 'Browse and search all HTTP status codes with descriptions and category filtering.',
    href: '/http-status',
    icon: HttpIcon,
    priority: 33,
    category: 'Web',
  },
  // ── Dev ──
  {
    title: 'Cron Expression Tester',
    description: 'Parse cron expressions with presets, format reference, and next occurrence previews.',
    href: '/cron',
    icon: ScheduleIcon,
    priority: 14,
    category: 'Dev',
  },
  {
    title: 'Timestamp Converter',
    description: 'Convert between Unix timestamps, ISO 8601, and human-readable date formats.',
    href: '/timestamp',
    icon: AccessTimeIcon,
    priority: 5,
    category: 'Dev',
  },
  {
    title: 'Cron to English Translator',
    description: 'Translate cron expressions into plain English with visual field breakdown.',
    href: '/cron-translator',
    icon: TranslateIcon,
    priority: 38,
    category: 'Dev',
  },
  {
    title: 'chmod Calculator',
    description: 'Calculate Unix file permissions with interactive checkboxes, octal, and symbolic notation.',
    href: '/chmod',
    icon: SecurityIcon,
    priority: 34,
    category: 'Dev',
  },
  {
    title: 'CIDR / Subnet Calculator',
    description: 'Calculate network address, broadcast, host range, and subnet mask from CIDR notation.',
    href: '/cidr',
    icon: LanIcon,
    priority: 32,
    category: 'Dev',
  },
  // ── AI ──
  {
    title: 'Token Counter',
    description: 'Estimate token counts for GPT-4, Claude, Gemini, Llama, and other LLMs.',
    href: '/token-counter',
    icon: CalculateIcon,
    priority: 29,
    category: 'AI',
  },
  {
    title: 'AI Pricing Calculator',
    description: 'Calculate cost estimates for LLM API calls across providers and models.',
    href: '/ai-pricing',
    icon: AttachMoneyIcon,
    priority: 28,
    category: 'AI',
  },
  {
    title: 'Prompt Template Editor',
    description: 'Build system/user/assistant prompt templates with {{variable}} placeholders.',
    href: '/prompt-editor',
    icon: EditNoteIcon,
    priority: 27,
    category: 'AI',
  },
  {
    title: 'Prompt Diff & Versioner',
    description: 'Track prompt versions and compare changes with line-by-line diff.',
    href: '/prompt-diff',
    icon: DifferenceIcon,
    priority: 26,
    category: 'AI',
  },
  {
    title: 'API Format Converter',
    description: 'Convert chat completion payloads between OpenAI, Anthropic, Gemini, and Ollama formats.',
    href: '/api-format',
    icon: SyncAltIcon,
    priority: 25,
    category: 'AI',
  },
  {
    title: 'Function Call Schema Builder',
    description: 'Visually build JSON schemas for LLM function calling / tool use.',
    href: '/function-schema',
    icon: AccountTreeIcon,
    priority: 24,
    category: 'AI',
  },
  {
    title: 'Text Chunker for RAG',
    description: 'Split text into chunks by tokens, sentences, paragraphs, or characters for RAG pipelines.',
    href: '/text-chunker',
    icon: ContentCutIcon,
    priority: 23,
    category: 'AI',
  },
  {
    title: 'Embedding Visualizer',
    description: 'Compute cosine, dot product, and Euclidean similarity between text embeddings.',
    href: '/embeddings',
    icon: ScatterPlotIcon,
    priority: 22,
    category: 'AI',
  },
  {
    title: 'Structured Output Validator',
    description: 'Validate LLM JSON output against a JSON Schema with real-time error paths and preset templates.',
    href: '/structured-output',
    icon: FactCheckIcon,
    priority: 30,
    category: 'AI',
  },
  {
    title: 'Model Context Window Chart',
    description: 'Compare context window sizes across GPT, Claude, Gemini, Llama, and more.',
    href: '/context-windows',
    icon: ViewTimelineIcon,
    priority: 31,
    category: 'AI',
  },
  {
    title: 'Tiktoken Playground',
    description: 'Visualize BPE tokenization boundaries with alternating colors and token stats.',
    href: '/tiktoken',
    icon: TextFieldsIcon,
    priority: 36,
    category: 'AI',
  },
] as const satisfies readonly ToolInfo[]).slice().sort((a, b) => b.priority - a.priority);
