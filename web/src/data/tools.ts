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
import type { SvgIconComponent } from '@mui/icons-material';

export interface ToolInfo {
  title: string;
  description: string;
  href: string;
  icon: SvgIconComponent;
  priority: number;
}

export const tools: ToolInfo[] = [
  {
    title: 'JSON Formatter & Validator',
    description: 'Format, minify, and validate JSON with real-time feedback, file upload, and download.',
    href: '/json-formatter',
    icon: DataObjectIcon,
    priority: 21,
  },
  {
    title: 'JSON / YAML Converter',
    description: 'Bidirectional real-time conversion between JSON and YAML with auto-detection.',
    href: '/json-yaml',
    icon: SwapHorizIcon,
    priority: 20,
  },
  {
    title: 'YAML Schema Validator',
    description: 'Validate YAML documents against JSON Schema definitions from schemastore.org.',
    href: '/yaml-validator',
    icon: SchemaIcon,
    priority: 19,
  },
  {
    title: 'JWT Decoder',
    description: 'Decode and inspect JWT headers, payloads, and claims with timestamp formatting.',
    href: '/jwt',
    icon: VpnKeyIcon,
    priority: 18,
  },
  {
    title: 'Text & File Compare',
    description: 'Compare two text inputs or uploaded files side-by-side with diff stats.',
    href: '/text-compare',
    icon: CompareArrowsIcon,
    priority: 17,
  },
  {
    title: 'Encode / Decode',
    description: 'Real-time encoding and decoding in Base64, URL, HTML, and SHA-256.',
    href: '/encode-decode',
    icon: EnhancedEncryptionIcon,
    priority: 16,
  },
  {
    title: 'CSV Delimiter Changer',
    description: 'Upload a CSV file, preview data, and convert delimiters with drag-and-drop.',
    href: '/csv-delimiter',
    icon: TableChartIcon,
    priority: 15,
  },
  {
    title: 'Cron Expression Tester',
    description: 'Parse cron expressions with presets, format reference, and next occurrence previews.',
    href: '/cron',
    icon: ScheduleIcon,
    priority: 14,
  },
  {
    title: 'UUID Generator',
    description: 'Generate UUIDs v4 (random) and v7 (time-ordered) with bulk generation support.',
    href: '/uuid',
    icon: FingerprintIcon,
    priority: 13,
  },
  {
    title: 'Hash Generator',
    description: 'Compute MD5, SHA-1, SHA-256, SHA-384, and SHA-512 hashes for text and files.',
    href: '/hash',
    icon: TagIcon,
    priority: 12,
  },
  {
    title: 'Base64 Image Encoder',
    description: 'Convert images to Base64 data URIs or decode Base64 strings back to images.',
    href: '/base64-image',
    icon: ImageIcon,
    priority: 11,
  },
  {
    title: 'Color Converter',
    description: 'Convert between HEX, RGB, HSL, and OKLCH color formats with a visual picker.',
    href: '/color-converter',
    icon: PaletteIcon,
    priority: 10,
  },
  {
    title: 'Regex Tester',
    description: 'Test regex patterns with live matching, capture groups, and common presets.',
    href: '/regex',
    icon: ManageSearchIcon,
    priority: 9,
  },
  {
    title: 'Lorem Ipsum Generator',
    description: 'Generate placeholder text by words, sentences, or paragraphs.',
    href: '/lorem-ipsum',
    icon: NotesIcon,
    priority: 8,
  },
  {
    title: 'Markdown Preview',
    description: 'Live Markdown editor with side-by-side HTML preview. Supports GFM.',
    href: '/markdown',
    icon: DescriptionIcon,
    priority: 7,
  },
  {
    title: 'URL Parser',
    description: 'Parse and breakdown URL components including protocol, host, path, and query params.',
    href: '/url-parser',
    icon: LinkIcon,
    priority: 6,
  },
  {
    title: 'Timestamp Converter',
    description: 'Convert between Unix timestamps, ISO 8601, and human-readable date formats.',
    href: '/timestamp',
    icon: AccessTimeIcon,
    priority: 5,
  },
  {
    title: 'QR Code Generator',
    description: 'Generate QR codes from text or URLs with customizable size and PNG download.',
    href: '/qr-code',
    icon: QrCode2Icon,
    priority: 4,
  },
  {
    title: 'HTML Entity Encoder',
    description: 'Encode special characters to HTML entities or decode entities back to characters.',
    href: '/html-entities',
    icon: CodeIcon,
    priority: 3,
  },
  {
    title: 'SQL Formatter',
    description: 'Format and beautify SQL queries with support for multiple dialects.',
    href: '/sql-formatter',
    icon: StorageIcon,
    priority: 2,
  },
  {
    title: 'JSON to TypeScript',
    description: 'Convert JSON objects into TypeScript interfaces and types automatically.',
    href: '/json-to-typescript',
    icon: TypeSpecimenIcon,
    priority: 1,
  },
].sort((a, b) => b.priority - a.priority);
