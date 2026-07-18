import { useCallback, useEffect, useRef, useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useThemeMode } from '../theme/ThemeProvider';
import { Box, Typography } from '@mui/material';

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
  onDiffChange?: (stats: DiffLineStats | null) => void;
  originalLabel?: string;
  modifiedLabel?: string;
  language?: string;
  height?: string | number;
}

export interface DiffLineStats {
  added: number;
  removed: number;
}

function syncEditorValue(codeEditor: editor.IStandaloneCodeEditor, value: string) {
  const model = codeEditor.getModel();
  if (!model || model.getValue() === value) return;

  model.pushStackElement();
  codeEditor.executeEdits('code-diff-editor.external-sync', [
    {
      range: model.getFullModelRange(),
      text: value,
      forceMoveMarkers: true,
    },
  ]);
  model.pushStackElement();
}

export function CodeDiffEditor({
  original,
  modified,
  onOriginalChange,
  onModifiedChange,
  onDiffChange,
  originalLabel = 'Original',
  modifiedLabel = 'Modified',
  language = 'plaintext',
  height = 500,
}: DiffEditorProps) {
  const { mode } = useThemeMode();
  const [{ original: initialOriginal, modified: initialModified }] = useState(() => ({ original, modified }));
  const callbacksRef = useRef({ onOriginalChange, onModifiedChange, onDiffChange });
  const valuesRef = useRef({ original, modified });
  const diffEditorRef = useRef<editor.IStandaloneDiffEditor | null>(null);
  const listenerDisposablesRef = useRef<Array<{ dispose: () => void }>>([]);

  useEffect(() => {
    callbacksRef.current = { onOriginalChange, onModifiedChange, onDiffChange };
  }, [onOriginalChange, onModifiedChange, onDiffChange]);

  useEffect(() => {
    valuesRef.current = { original, modified };
    const diffEditor = diffEditorRef.current;
    if (!diffEditor) return;

    syncEditorValue(diffEditor.getOriginalEditor(), original);
    syncEditorValue(diffEditor.getModifiedEditor(), modified);
  }, [original, modified]);

  const disposeListeners = useCallback(() => {
    listenerDisposablesRef.current.forEach((disposable) => disposable.dispose());
    listenerDisposablesRef.current = [];
  }, []);

  useEffect(
    () => () => {
      diffEditorRef.current = null;
      disposeListeners();
    },
    [disposeListeners],
  );

  const handleMount = useCallback(
    (diffEditor: editor.IStandaloneDiffEditor) => {
      disposeListeners();
      diffEditorRef.current = diffEditor;

      const publishDiffStats = () => {
        const changes = diffEditor.getLineChanges();
        if (changes === null) {
          callbacksRef.current.onDiffChange?.(null);
          return;
        }

        const countLines = (start: number, end: number) => (end === 0 ? 0 : end - start + 1);
        const stats = changes.reduce<DiffLineStats>(
          (totals, change) => ({
            added: totals.added + countLines(change.modifiedStartLineNumber, change.modifiedEndLineNumber),
            removed: totals.removed + countLines(change.originalStartLineNumber, change.originalEndLineNumber),
          }),
          { added: 0, removed: 0 },
        );
        callbacksRef.current.onDiffChange?.(stats);
      };

      listenerDisposablesRef.current = [
        diffEditor.getOriginalEditor().onDidChangeModelContent(() => {
          callbacksRef.current.onDiffChange?.(null);
          callbacksRef.current.onOriginalChange?.(diffEditor.getOriginalEditor().getValue());
        }),
        diffEditor.getModifiedEditor().onDidChangeModelContent(() => {
          callbacksRef.current.onDiffChange?.(null);
          callbacksRef.current.onModifiedChange?.(diffEditor.getModifiedEditor().getValue());
        }),
        diffEditor.onDidUpdateDiff(publishDiffStats),
      ];

      syncEditorValue(diffEditor.getOriginalEditor(), valuesRef.current.original);
      syncEditorValue(diffEditor.getModifiedEditor(), valuesRef.current.modified);
      publishDiffStats();
    },
    [disposeListeners],
  );

  return (
    <Box
      role="group"
      aria-label={`${originalLabel} and ${modifiedLabel} comparison`}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease',
        '&:hover': { borderColor: 'action.disabled' },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      >
        {[originalLabel, modifiedLabel].map((label, index) => (
          <Typography
            key={`${index}-${label}`}
            component="div"
            variant="caption"
            title={label}
            sx={{
              minWidth: 0,
              px: 1.5,
              py: 0.75,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              borderLeft: index === 1 ? 1 : 0,
              borderColor: 'divider',
            }}
          >
            {label}
          </Typography>
        ))}
      </Box>
      <DiffEditor
        height={height}
        language={language}
        original={initialOriginal}
        modified={initialModified}
        onMount={handleMount}
        theme={mode === 'dark' ? 'vs-dark' : 'vs'}
        loading={
          <Box role="status" sx={{ p: 2, color: 'text.secondary' }}>
            Loading comparison editor…
          </Box>
        }
        options={{
          originalEditable: true,
          automaticLayout: true,
          renderSideBySide: true,
          useInlineViewWhenSpaceIsLimited: true,
          renderSideBySideInlineBreakpoint: 800,
          ignoreTrimWhitespace: false,
          diffAlgorithm: 'advanced',
          diffWordWrap: 'on',
          wordWrap: 'on',
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          scrollBeyondLastLine: false,
          tabFocusMode: true,
          accessibilityVerbose: true,
          originalAriaLabel: `${originalLabel} editor`,
          modifiedAriaLabel: `${modifiedLabel} editor`,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: 'none',
          overviewRulerLanes: 0,
          renderOverviewRuler: false,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
        }}
      />
    </Box>
  );
}
