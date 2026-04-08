import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { lazy, Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';

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

function Loading() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress />
    </Box>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          {/* New clean routes */}
          <Route path="/json-formatter" element={<JsonFormatter />} />
          <Route path="/yaml-validator" element={<YamlValidator />} />
          <Route path="/jwt" element={<JwtDecoder />} />
          <Route path="/text-compare" element={<TextCompare />} />
          <Route path="/encode-decode" element={<EncodeDecode />} />
          <Route path="/csv-delimiter" element={<CsvDelimiter />} />
          <Route path="/cron" element={<CronTester />} />
          <Route path="/json-yaml" element={<JsonYamlConverter />} />
          <Route path="/uuid" element={<UuidGenerator />} />
          <Route path="/hash" element={<HashGenerator />} />
          <Route path="/base64-image" element={<Base64ImageEncoder />} />
          <Route path="/color-converter" element={<ColorConverter />} />
          <Route path="/regex" element={<RegexTester />} />
          <Route path="/lorem-ipsum" element={<LoremIpsumGenerator />} />
          <Route path="/markdown" element={<MarkdownPreview />} />
          <Route path="/url-parser" element={<UrlParser />} />
          <Route path="/timestamp" element={<TimestampConverter />} />
          <Route path="/qr-code" element={<QrCodeGenerator />} />
          <Route path="/html-entities" element={<HtmlEntityEncoder />} />
          <Route path="/sql-formatter" element={<SqlFormatter />} />
          <Route path="/json-to-typescript" element={<JsonToTypescript />} />
          <Route path="/token-counter" element={<TokenCounter />} />
          <Route path="/ai-pricing" element={<AiPricingCalculator />} />
          <Route path="/prompt-editor" element={<PromptTemplateEditor />} />
          <Route path="/prompt-diff" element={<PromptDiff />} />
          <Route path="/api-format" element={<ApiFormatConverter />} />
          <Route path="/function-schema" element={<FunctionCallBuilder />} />
          <Route path="/text-chunker" element={<TextChunker />} />
          <Route path="/embeddings" element={<EmbeddingVisualizer />} />
          {/* Legacy redirects for old URLs */}
          <Route path="/jsonFormatter" element={<JsonFormatter />} />
          <Route path="/yaml-schema-validator" element={<YamlValidator />} />
          <Route path="/textCompare" element={<TextCompare />} />
          <Route path="/change-csv-delimiter" element={<CsvDelimiter />} />
          <Route path="/NCrontab" element={<CronTester />} />
          <Route path="/jsonToYaml" element={<JsonYamlConverter />} />
          <Route path="/yamlToJson" element={<JsonYamlConverter />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
