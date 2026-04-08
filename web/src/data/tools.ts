import DataObjectIcon from '@mui/icons-material/DataObject';
import SchemaIcon from '@mui/icons-material/Schema';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import EnhancedEncryptionIcon from '@mui/icons-material/EnhancedEncryption';
import TableChartIcon from '@mui/icons-material/TableChart';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import TransformIcon from '@mui/icons-material/Transform';
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
    description: 'Format, minify, and validate JSON with syntax highlighting.',
    href: '/jsonFormatter',
    icon: DataObjectIcon,
    priority: 10,
  },
  {
    title: 'YAML Schema Validator',
    description: 'Validate YAML documents against JSON Schema definitions from schemastore.org.',
    href: '/yaml-schema-validator',
    icon: SchemaIcon,
    priority: 9,
  },
  {
    title: 'JWT Decoder',
    description: 'Decode and inspect JSON Web Token headers and payloads.',
    href: '/jwt',
    icon: VpnKeyIcon,
    priority: 8,
  },
  {
    title: 'Text & File Compare',
    description: 'Compare two text inputs or uploaded files side-by-side with diff highlighting.',
    href: '/textCompare',
    icon: CompareArrowsIcon,
    priority: 7,
  },
  {
    title: 'Encode / Decode',
    description: 'Encode and decode strings in Base64, URL, and HTML formats.',
    href: '/encode-decode',
    icon: EnhancedEncryptionIcon,
    priority: 6,
  },
  {
    title: 'CSV Delimiter Changer',
    description: 'Upload a CSV file and convert its delimiter to any character.',
    href: '/change-csv-delimiter',
    icon: TableChartIcon,
    priority: 5,
  },
  {
    title: 'Cron Expression Tester',
    description: 'Parse and test cron expressions with next occurrence previews.',
    href: '/NCrontab',
    icon: ScheduleIcon,
    priority: 4,
  },
  {
    title: 'JSON to YAML',
    description: 'Convert JSON documents to YAML format instantly.',
    href: '/jsonToYaml',
    icon: SwapHorizIcon,
    priority: 3,
  },
  {
    title: 'YAML to JSON',
    description: 'Convert YAML documents to JSON format instantly.',
    href: '/yamlToJson',
    icon: TransformIcon,
    priority: 2,
  },
].sort((a, b) => b.priority - a.priority);
