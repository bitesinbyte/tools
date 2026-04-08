import DataObjectIcon from '@mui/icons-material/DataObject';
import SchemaIcon from '@mui/icons-material/Schema';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import EnhancedEncryptionIcon from '@mui/icons-material/EnhancedEncryption';
import TableChartIcon from '@mui/icons-material/TableChart';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
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
    priority: 10,
  },
  {
    title: 'JSON / YAML Converter',
    description: 'Bidirectional real-time conversion between JSON and YAML with auto-detection.',
    href: '/json-yaml',
    icon: SwapHorizIcon,
    priority: 9,
  },
  {
    title: 'YAML Schema Validator',
    description: 'Validate YAML documents against JSON Schema definitions from schemastore.org.',
    href: '/yaml-validator',
    icon: SchemaIcon,
    priority: 8,
  },
  {
    title: 'JWT Decoder',
    description: 'Decode and inspect JWT headers, payloads, and claims with timestamp formatting.',
    href: '/jwt',
    icon: VpnKeyIcon,
    priority: 7,
  },
  {
    title: 'Text & File Compare',
    description: 'Compare two text inputs or uploaded files side-by-side with diff stats.',
    href: '/text-compare',
    icon: CompareArrowsIcon,
    priority: 6,
  },
  {
    title: 'Encode / Decode',
    description: 'Real-time encoding and decoding in Base64, URL, HTML, and SHA-256.',
    href: '/encode-decode',
    icon: EnhancedEncryptionIcon,
    priority: 5,
  },
  {
    title: 'CSV Delimiter Changer',
    description: 'Upload a CSV file, preview data, and convert delimiters with drag-and-drop.',
    href: '/csv-delimiter',
    icon: TableChartIcon,
    priority: 4,
  },
  {
    title: 'Cron Expression Tester',
    description: 'Parse cron expressions with presets, format reference, and next occurrence previews.',
    href: '/cron',
    icon: ScheduleIcon,
    priority: 3,
  },
].sort((a, b) => b.priority - a.priority);
