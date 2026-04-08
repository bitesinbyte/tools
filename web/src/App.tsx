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
