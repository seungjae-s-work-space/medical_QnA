import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, IconButton, Popover, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EmojiSymbolsRoundedIcon from '@mui/icons-material/EmojiSymbolsRounded';
import HorizontalRuleRoundedIcon from '@mui/icons-material/HorizontalRuleRounded';
import { colors } from '../theme';
import { editorSymbolGroups } from '../utils/editorSymbols';
import { insertEditorDivider, insertEditorSymbol, restoreEditorSelection } from '../utils/quillInsertions';

const toolButtonSx = { p: 0, width: 28, height: 24, borderRadius: 0.5, color: colors.textPrimary };

export default function EditorInsertTools({ quillRef, scrollRef }) {
  const [editor, setEditor] = useState(null);
  const [picker, setPicker] = useState(null);
  const [group, setGroup] = useState(0);
  const lastRange = useRef({ index: 0, length: 0 });
  const pendingSelection = useRef(null);
  const id = useId();

  useEffect(() => {
    const quill = quillRef.current?.getEditor?.();
    const toolbar = quill?.getModule?.('toolbar')?.container;
    if (!toolbar) return undefined;
    const rememberSelection = (range) => {
      if (range) lastRange.current = { index: range.index, length: range.length };
    };
    rememberSelection(quill.getSelection());
    quill.on('selection-change', rememberSelection);
    setEditor({ quill, toolbar });
    return () => quill.off('selection-change', rememberSelection);
  }, [quillRef]);

  useEffect(() => {
    if (!picker && editor && pendingSelection.current) {
      // Restore after the popover focus trap has closed, not while it is still open.
      restoreEditorSelection(editor.quill, pendingSelection.current, scrollRef.current);
      lastRange.current = pendingSelection.current;
      pendingSelection.current = null;
    }
  }, [picker, editor, scrollRef]);

  if (!editor) return null;
  const getRange = () => editor.quill.getSelection() || lastRange.current;
  const closePicker = () => {
    if (picker) pendingSelection.current = picker.range;
    setPicker(null);
  };

  return (
    <>
      {createPortal(
        <span className="ql-formats">
          <Tooltip title="기호 삽입">
            <IconButton
              aria-label="기호 삽입"
              aria-haspopup="dialog"
              aria-expanded={Boolean(picker)}
              sx={toolButtonSx}
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                setGroup(0);
                setPicker({ anchor: event.currentTarget, range: { ...getRange() } });
              }}
            >
              <EmojiSymbolsRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="구분선 삽입">
            <IconButton
              aria-label="구분선 삽입"
              sx={toolButtonSx}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                const range = insertEditorDivider(editor.quill, getRange(), scrollRef.current);
                if (range) lastRange.current = range;
              }}
            >
              <HorizontalRuleRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </span>,
        editor.toolbar,
      )}
      <Popover
        open={Boolean(picker)}
        anchorEl={picker?.anchor}
        onClose={closePicker}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        disableScrollLock
        disableRestoreFocus
        PaperProps={{
          role: 'dialog',
          'aria-label': '기호 선택',
          sx: { width: 360, maxWidth: 'calc(100vw - 32px)', borderRadius: 2, bgcolor: colors.card },
        }}
      >
        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 600, fontSize: 15 }}>기호</Typography>
          <IconButton aria-label="기호 선택 닫기" onClick={closePicker} size="small"><CloseRoundedIcon fontSize="small" /></IconButton>
        </Box>
        <Tabs value={group} onChange={(_event, value) => setGroup(value)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile aria-label="기호 종류">
          {editorSymbolGroups.map((item, index) => (
            <Tab key={item.label} label={item.label} id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} sx={{ minWidth: 64, px: 1.5, fontSize: 13 }} />
          ))}
        </Tabs>
        <Box
          role="tabpanel"
          id={`${id}-panel-${group}`}
          aria-labelledby={`${id}-tab-${group}`}
          sx={{ p: 1.5, display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 0.5 }}
        >
          {editorSymbolGroups[group].symbols.map(([symbol, label]) => (
            <Tooltip key={symbol} title={label}>
              <IconButton
                aria-label={`${label} (${symbol})`}
                onClick={() => {
                  if (!picker) return;
                  pendingSelection.current = insertEditorSymbol(editor.quill, picker.range, symbol, scrollRef.current);
                  setPicker(null);
                }}
                sx={{ width: '100%', height: 42, borderRadius: 1, fontSize: 22, color: colors.textPrimary, '&:hover': { bgcolor: colors.primaryLight } }}
              >
                {symbol}
              </IconButton>
            </Tooltip>
          ))}
        </Box>
      </Popover>
    </>
  );
}
