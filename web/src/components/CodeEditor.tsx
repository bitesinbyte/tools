import Editor, { DiffEditor } from '@monaco-editor/react';
import { useThemeMode } from '../theme/ThemeProvider';
import { Box } from '@mui/material';

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  height?: string | number;
}

export function CodeEditor({ value, onChange, language = 'json', readOnly = false, height = 400 }: CodeEditorProps) {
  const { mode } = useThemeMode();

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease',
        '&:hover': { borderColor: 'action.disabled' },
      }}
    >
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={(v) => onChange?.(v ?? '')}
        theme={mode === 'dark' ? 'vs-dark' : 'vs'}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          wordWrap: 'on',
          formatOnPaste: true,
          formatOnType: true,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: 'none',
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
        }}
      />
    </Box>
  );
}

interface DiffEditorProps {
  original: string;
  modified: string;
  onOriginalChange?: (value: string) => void;
  onModifiedChange?: (value: string) => void;
  language?: string;
  height?: string | number;
}

export function CodeDiffEditor({ original, modified, language = 'plaintext', height = 500 }: DiffEditorProps) {
  const { mode } = useThemeMode();

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease',
        '&:hover': { borderColor: 'action.disabled' },
      }}
    >
      <DiffEditor
        height={height}
        language={language}
        original={original}
        modified={modified}
        theme={mode === 'dark' ? 'vs-dark' : 'vs'}
        options={{
          originalEditable: true,
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: 'none',
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
        }}
      />
    </Box>
  );
}
