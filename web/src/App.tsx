import { Navigate, Link, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { tools, type ToolPath } from './data/tools';
import PageHead from './components/PageHead';

const Home = lazy(() => import('./pages/Home'));
const JsonFormatter = lazy(() => import('./pages/tools/JsonFormatter'));
const YamlValidator = lazy(() => import('./pages/tools/YamlValidator'));
const JwtDecoder = lazy(() => import('./pages/tools/JwtDecoder'));
const TextCompare = lazy(() => import('./pages/tools/TextCompare'));
const EncodeDecode = lazy(() => import('./pages/tools/EncodeDecode'));
const CsvDelimiter = lazy(() => import('./pages/tools/CsvDelimiter'));
const CronTester = lazy(() => import('./pages/tools/CronTester'));
const JsonYamlConverter = lazy(() => import('./pages/tools/JsonYamlConverter'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const UuidGenerator = lazy(() => import('./pages/tools/UuidGenerator'));
const HashGenerator = lazy(() => import('./pages/tools/HashGenerator'));
const Base64ImageEncoder = lazy(() => import('./pages/tools/Base64ImageEncoder'));
const ColorConverter = lazy(() => import('./pages/tools/ColorConverter'));
const RegexTester = lazy(() => import('./pages/tools/RegexTester'));
const LoremIpsumGenerator = lazy(() => import('./pages/tools/LoremIpsumGenerator'));
const MarkdownPreview = lazy(() => import('./pages/tools/MarkdownPreview'));
const UrlParser = lazy(() => import('./pages/tools/UrlParser'));
const TimestampConverter = lazy(() => import('./pages/tools/TimestampConverter'));
const QrCodeGenerator = lazy(() => import('./pages/tools/QrCodeGenerator'));
const HtmlEntityEncoder = lazy(() => import('./pages/tools/HtmlEntityEncoder'));
const SqlFormatter = lazy(() => import('./pages/tools/SqlFormatter'));
const JsonToTypescript = lazy(() => import('./pages/tools/JsonToTypescript'));
const TokenCounter = lazy(() => import('./pages/tools/TokenCounter'));
const AiPricingCalculator = lazy(() => import('./pages/tools/AiPricingCalculator'));
const PromptTemplateEditor = lazy(() => import('./pages/tools/PromptTemplateEditor'));
const PromptDiff = lazy(() => import('./pages/tools/PromptDiff'));
const ApiFormatConverter = lazy(() => import('./pages/tools/ApiFormatConverter'));
const FunctionCallBuilder = lazy(() => import('./pages/tools/FunctionCallBuilder'));
const TextChunker = lazy(() => import('./pages/tools/TextChunker'));
const EmbeddingVisualizer = lazy(() => import('./pages/tools/EmbeddingVisualizer'));
const StructuredOutputValidator = lazy(() => import('./pages/tools/StructuredOutputValidator'));
const CssMinifier = lazy(() => import('./pages/tools/CssMinifier'));
const JsonPathEvaluator = lazy(() => import('./pages/tools/JsonPathEvaluator'));
const CronTranslator = lazy(() => import('./pages/tools/CronTranslator'));
const DiffToPatch = lazy(() => import('./pages/tools/DiffToPatch'));
const BaseConverter = lazy(() => import('./pages/tools/BaseConverter'));
const ChmodCalculator = lazy(() => import('./pages/tools/ChmodCalculator'));
const HttpStatusCodes = lazy(() => import('./pages/tools/HttpStatusCodes'));
const CidrCalculator = lazy(() => import('./pages/tools/CidrCalculator'));
const ModelContextWindow = lazy(() => import('./pages/tools/ModelContextWindow'));
const TiktokenPlayground = lazy(() => import('./pages/tools/TiktokenPlayground'));
const OpenApiToMcp = lazy(() => import('./pages/tools/OpenApiToMcp'));

type LazyPage = LazyExoticComponent<ComponentType>;

const toolRoutes = {
  '/json-formatter': JsonFormatter,
  '/yaml-validator': YamlValidator,
  '/jwt': JwtDecoder,
  '/text-compare': TextCompare,
  '/encode-decode': EncodeDecode,
  '/csv-delimiter': CsvDelimiter,
  '/cron': CronTester,
  '/json-yaml': JsonYamlConverter,
  '/uuid': UuidGenerator,
  '/hash': HashGenerator,
  '/base64-image': Base64ImageEncoder,
  '/color-converter': ColorConverter,
  '/regex': RegexTester,
  '/lorem-ipsum': LoremIpsumGenerator,
  '/markdown': MarkdownPreview,
  '/url-parser': UrlParser,
  '/timestamp': TimestampConverter,
  '/qr-code': QrCodeGenerator,
  '/html-entities': HtmlEntityEncoder,
  '/sql-formatter': SqlFormatter,
  '/json-to-typescript': JsonToTypescript,
  '/token-counter': TokenCounter,
  '/ai-pricing': AiPricingCalculator,
  '/prompt-editor': PromptTemplateEditor,
  '/prompt-diff': PromptDiff,
  '/api-format': ApiFormatConverter,
  '/function-schema': FunctionCallBuilder,
  '/text-chunker': TextChunker,
  '/embeddings': EmbeddingVisualizer,
  '/structured-output': StructuredOutputValidator,
  '/css-minifier': CssMinifier,
  '/json-path': JsonPathEvaluator,
  '/cron-translator': CronTranslator,
  '/diff-patch': DiffToPatch,
  '/base-converter': BaseConverter,
  '/chmod': ChmodCalculator,
  '/http-status': HttpStatusCodes,
  '/cidr': CidrCalculator,
  '/context-windows': ModelContextWindow,
  '/tiktoken': TiktokenPlayground,
  '/openapi-to-mcp': OpenApiToMcp,
} satisfies Record<ToolPath, LazyPage>;

const legacyRoutes: ReadonlyArray<{ from: string; to: ToolPath }> = [
  { from: '/jsonFormatter', to: '/json-formatter' },
  { from: '/yaml-schema-validator', to: '/yaml-validator' },
  { from: '/textCompare', to: '/text-compare' },
  { from: '/change-csv-delimiter', to: '/csv-delimiter' },
  { from: '/NCrontab', to: '/cron' },
  { from: '/jsonToYaml', to: '/json-yaml' },
  { from: '/yamlToJson', to: '/json-yaml' },
];

function NotFound() {
  return (
    <Stack spacing={2} sx={{ alignItems: 'center', py: { xs: 8, md: 12 }, textAlign: 'center' }}>
      <PageHead
        title="Page Not Found - Bites In Byte"
        description="The requested Bites In Byte page could not be found."
        noIndex
      />
      <Typography component="h1" variant="h3">
        Page not found
      </Typography>
      <Typography color="text.secondary">
        The page may have moved, or the address may be incorrect.
      </Typography>
      <Button component={Link} to="/" variant="contained">
        Browse all tools
      </Button>
    </Stack>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        {tools.map(({ href }) => {
          const Page = toolRoutes[href];
          return <Route key={href} path={href} element={<Page />} />;
        })}
        {legacyRoutes.map(({ from, to }) => (
          <Route key={from} path={from} element={<Navigate to={to} replace />} />
        ))}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
