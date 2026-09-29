import { useState } from 'react';
import {
  Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Tooltip, Typography,
} from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import { colors } from '../theme';

const email = 'chosun3021@naver.com';
const message = [
  '난임정보톡톡은 전 세계 난임·생식의료 분야의 최신 연구와 임상 정보를 바탕으로 전문 콘텐츠를 제작하고 있습니다.',
  '난임·임신·출산·여성건강·남성건강·의료·바이오 등 난임정보톡톡의 콘텐츠와 잘 어울리는 광고 및 협찬, 콘텐츠 제휴, 공동 프로젝트를 기다립니다.',
  '단순히 광고를 노출하는 데 그치지 않고, 독자에게 도움이 되는 정보와 브랜드의 가치를 자연스럽게 연결하는 협업을 지향합니다.',
];
const editorialPolicy = '광고·협찬 콘텐츠는 일반 콘텐츠와 명확하게 구분해 표시하며, 광고 여부와 관계없이 의학·연구 정보의 정확성과 편집의 독립성을 지킵니다.';
const closing = '좋은 정보와 좋은 브랜드가 만날 수 있는 협업을 기다립니다.';
const bodySx = { fontSize: 15, lineHeight: 1.85, wordBreak: 'keep-all', overflowWrap: 'anywhere', letterSpacing: 0 };

function PartnershipContact() {
  const [copying, setCopying] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleCopy = async () => {
    if (copying) return;
    setCopying(true);
    setFeedback(null);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(email);
      setFeedback({ success: true, text: '이메일 주소를 복사했습니다.' });
    } catch {
      setFeedback({ success: false, text: '복사하지 못했습니다. 이메일 주소를 선택해 복사해주세요.' });
    } finally {
      setCopying(false);
    }
  };

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: colors.textSecondary, mb: 1 }}>
        광고·협찬 및 제휴 문의
      </Typography>
      <Typography sx={{
        fontSize: 20, fontWeight: 700, lineHeight: 1.5, color: colors.textPrimary,
        letterSpacing: 0, userSelect: 'all', overflowWrap: 'anywhere',
      }}>{email}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 2 }}>
        <Button component="a" href={`mailto:${email}`} variant="outlined"
          startIcon={<MailOutlineRoundedIcon fontSize="small" />} sx={{ minHeight: 44 }}>
          이메일 보내기
        </Button>
        <Tooltip title="이메일 주소 복사">
          <IconButton aria-label="이메일 주소 복사" aria-disabled={copying} onClick={handleCopy}
            sx={{ width: 44, height: 44, color: colors.primaryDark, bgcolor: colors.primarySoft }}>
            {feedback?.success ? <CheckRoundedIcon fontSize="small" /> : <ContentCopyRoundedIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>
      <Typography role="status" aria-live="polite" sx={{
        fontSize: 12, lineHeight: 1.5, minHeight: 36, mt: 1.5, overflowWrap: 'anywhere',
        color: feedback?.success ? colors.primaryDark : colors.textSecondary,
      }}>{feedback?.text || ''}</Typography>
    </Box>
  );
}

export default function HomePartnershipSection() {
  const [open, setOpen] = useState(false);

  return (
    <Box component="section" id="partnership" aria-labelledby="home-partnership-title" sx={{
      mt: 2, pt: 4, pb: 1, borderTop: `1px solid ${colors.inputBorder}`, scrollMarginTop: 80,
      color: colors.textPrimary, letterSpacing: 0,
    }}>
      <Box sx={{
        display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.4fr) minmax(0, 1fr)' },
        gap: { xs: 3, md: 5 }, alignItems: 'start',
      }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography id="home-partnership-title" component="h2" sx={{
            fontSize: 22, lineHeight: 1.45, fontWeight: 700, mb: 2,
            wordBreak: 'keep-all', overflowWrap: 'anywhere', letterSpacing: 0,
          }}>광고·협찬 문의</Typography>
          <Typography sx={{ ...bodySx, color: colors.textSecondary }}>{message[0]}</Typography>
          <Typography sx={{ ...bodySx, mt: 1.5 }}>{closing}</Typography>
          <Button aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? 'partnership-dialog' : undefined}
            onClick={() => setOpen(true)} endIcon={<ArrowForwardRoundedIcon fontSize="small" />}
            sx={{ color: colors.primaryDark, px: 0, mt: 1, minHeight: 44, '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}>
            광고·협찬 안내 자세히 보기
          </Button>
        </Box>
        <PartnershipContact />
      </Box>
      <Typography sx={{ ...bodySx, fontSize: 14, color: colors.textSecondary, mt: 3 }}>
        {editorialPolicy}
      </Typography>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth
        aria-labelledby="partnership-dialog-title"
        PaperProps={{ id: 'partnership-dialog', sx: { m: 2, width: 'calc(100% - 32px)', maxHeight: 'calc(100% - 32px)' } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, px: 2.5, pt: 2.5, pb: 2, borderBottom: `1px solid ${colors.divider}` }}>
          <DialogTitle id="partnership-dialog-title" sx={{ p: 0, flex: 1, fontSize: 20, lineHeight: 1.5, fontWeight: 700, wordBreak: 'keep-all', overflowWrap: 'anywhere', letterSpacing: 0 }}>
            광고·협찬 문의
          </DialogTitle>
          <Tooltip title="닫기">
            <IconButton aria-label="광고·협찬 안내 닫기" onClick={() => setOpen(false)} sx={{ width: 44, height: 44, mt: -0.75, mr: -1, flexShrink: 0 }}>
              <CloseRoundedIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <DialogContent sx={{ p: 2.5 }}>
          {message.map(paragraph => <Typography key={paragraph} sx={{ ...bodySx, mb: 2 }}>{paragraph}</Typography>)}
          <Typography sx={{ ...bodySx, mb: 3 }}>{editorialPolicy}</Typography>
          <PartnershipContact />
          <Typography sx={{ ...bodySx, mt: 2, color: colors.textSecondary }}>{closing}</Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
