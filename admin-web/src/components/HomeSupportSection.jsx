import { useState } from 'react';
import {
  Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Tooltip, Typography,
} from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import { colors } from '../theme';

const account = { bank: '신한은행', number: '100-034-168251', holder: '아기성공연구소' };
const message = [
  '난임정보톡톡은 전 세계에서 발표되는 난임·생식의료 분야의 논문과 최신 연구, 임상 정보를 직접 찾아 읽고 확인하며, 꼭 필요한 내용을 누구나 이해하기 쉬운 언어로 전하고 있습니다.',
  '하나의 정보를 전하기 위해 여러 논문과 자료를 찾아 비교하고, 연구 결과가 실제 난임 치료를 받는 분들에게 어떤 의미가 있는지 꼼꼼하게 살펴봅니다.',
  '빠르게 변하는 난임의학의 흐름 속에서 정확하고 믿을 수 있는 정보를 더 많은 분께 무료로 전하는 일, 난임정보톡톡이 오래도록 이어가고 싶은 일입니다.',
  '이 작은 공간이 도움이 되셨다면 자발적인 후원으로 함께해 주세요.',
  '보내주시는 따뜻한 마음은 더 많은 연구를 찾고, 더 좋은 정보를 만드는 힘이 됩니다.',
];
const freeAccess = '후원 여부와 관계없이 난임정보톡톡의 공개 정보는 누구나 자유롭게 이용하실 수 있습니다.';
const closing = '당신의 응원이, 누군가에게 꼭 필요한 난임정보 한 편으로 돌아가겠습니다.';
const bodySx = { fontSize: 15, lineHeight: 1.85, wordBreak: 'keep-all', overflowWrap: 'anywhere', letterSpacing: 0 };

function SupportAccount() {
  const [copying, setCopying] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleCopy = async () => {
    if (copying) return;
    setCopying(true);
    setFeedback(null);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(account.number.replaceAll('-', ''));
      setFeedback({ success: true, text: '계좌번호를 복사했습니다.' });
    } catch {
      setFeedback({ success: false, text: '복사하지 못했습니다. 계좌번호를 선택해 복사해주세요.' });
    } finally {
      setCopying(false);
    }
  };

  return (
    <Box sx={{ p: 2, bgcolor: colors.card, border: `1px solid ${colors.border}`, borderRadius: 2 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: colors.textSecondary, mb: 2 }}>
        난임정보톡톡 자발적 후원계좌
      </Typography>
      <Typography sx={{ fontSize: 15, fontWeight: 600, color: colors.primaryDark }}>{account.bank}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
        <Typography component="span" sx={{
          fontSize: 20, lineHeight: 1.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
          color: colors.textPrimary, letterSpacing: 0, userSelect: 'all', overflowWrap: 'anywhere',
        }}>{account.number}</Typography>
        <Tooltip title="계좌번호 복사">
          <span><IconButton aria-label="계좌번호 복사" aria-disabled={copying} onClick={handleCopy}
            sx={{ width: 44, height: 44, color: colors.primaryDark, bgcolor: colors.primarySoft }}>
            {feedback?.success ? <CheckRoundedIcon fontSize="small" /> : <ContentCopyRoundedIcon fontSize="small" />}
          </IconButton></span>
        </Tooltip>
      </Box>
      <Typography sx={{ fontSize: 14, color: colors.textSecondary, mt: 0.5 }}>예금주 {account.holder}</Typography>
      <Typography role="status" aria-live="polite" sx={{
        fontSize: 12, lineHeight: 1.5, minHeight: 36, mt: 1.5, overflowWrap: 'anywhere',
        color: feedback?.success ? colors.primaryDark : colors.textSecondary,
      }}>{feedback?.text || ''}</Typography>
    </Box>
  );
}

export default function HomeSupportSection() {
  const [open, setOpen] = useState(false);
  return (
    <Box component="section" id="support" aria-labelledby="home-support-title" sx={{
      mt: 2, pt: 4, pb: 1, borderTop: `1px solid ${colors.inputBorder}`, scrollMarginTop: 80,
      color: colors.textPrimary, letterSpacing: 0,
    }}>
      <Box sx={{
        display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.4fr) minmax(0, 1fr)' },
        gap: { xs: 3, md: 5 }, alignItems: 'start',
      }}>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, color: colors.primaryDark }}>
            <FavoriteBorderRoundedIcon sx={{ fontSize: 20 }} />
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>함께 만드는 난임정보</Typography>
          </Box>
          <Typography id="home-support-title" component="h2" sx={{
            fontSize: 22, lineHeight: 1.45, fontWeight: 700, mb: 2,
            wordBreak: 'keep-all', overflowWrap: 'anywhere', letterSpacing: 0,
          }}>난임정보톡톡을 응원해주세요</Typography>
          <Typography sx={{ ...bodySx, color: colors.textSecondary }}>{message[0]}</Typography>
          <Typography sx={{ ...bodySx, mt: 1.5 }}>{message[3]}</Typography>
          <Button aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? 'support-dialog' : undefined}
            onClick={() => setOpen(true)} endIcon={<ArrowForwardRoundedIcon fontSize="small" />}
            sx={{ color: colors.primaryDark, px: 0, mt: 1, minHeight: 44, '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}>
            후원 안내 자세히 보기
          </Button>
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ ...bodySx, fontSize: 14, color: colors.primaryDark, mb: 2 }}>{freeAccess}</Typography>
          <SupportAccount />
        </Box>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth
        aria-labelledby="support-dialog-title" PaperProps={{ id: 'support-dialog', sx: { m: 2, width: 'calc(100% - 32px)', maxHeight: 'calc(100% - 32px)' } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, px: 2.5, pt: 2.5, pb: 2, borderBottom: `1px solid ${colors.divider}` }}>
          <DialogTitle id="support-dialog-title" sx={{ p: 0, flex: 1, fontSize: 20, lineHeight: 1.5, fontWeight: 700, wordBreak: 'keep-all', overflowWrap: 'anywhere', letterSpacing: 0 }}>
            난임정보톡톡을 응원해주세요
          </DialogTitle>
          <Tooltip title="닫기"><IconButton aria-label="후원 안내 닫기" onClick={() => setOpen(false)} sx={{ width: 44, height: 44, mt: -0.75, mr: -1, flexShrink: 0 }}><CloseRoundedIcon /></IconButton></Tooltip>
        </Box>
        <DialogContent sx={{ p: 2.5 }}>
          {message.map((paragraph) => <Typography key={paragraph} sx={{ ...bodySx, mb: 2, color: colors.textPrimary }}>{paragraph}</Typography>)}
          <Typography sx={{ ...bodySx, color: colors.primaryDark, fontWeight: 600, pt: 1, mb: 2 }}>{freeAccess}</Typography>
          <SupportAccount />
          <Typography sx={{ ...bodySx, mt: 3, color: colors.textSecondary }}>{closing}</Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
