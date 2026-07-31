import { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { useParams } from 'react-router-dom';
import { colors } from '../theme';
import { getPromotion } from '../services/promotionService';
import { getArticleContentSx } from '../utils/articleContentStyles';

function PromotionDetail() {
  const { promotionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [promotion, setPromotion] = useState(null);

  useEffect(() => {
    let isMounted = true;

    getPromotion(promotionId)
      .then((promotionDetail) => {
        if (isMounted) {
          setPromotion(promotionDetail);
        }
      })
      .catch((error) => {
        console.error('Promotion detail load error:', error);
        if (isMounted) {
          setPromotion(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [promotionId]);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress sx={{ color: colors.primaryDark }} />
      </Box>
    );
  }

  if (!promotion) {
    return (
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 680,
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            border: `1px solid ${colors.border}`,
            bgcolor: 'rgba(255,255,255,0.78)',
            textAlign: 'center',
          }}
        >
          <Typography sx={{ color: colors.textPrimary, fontSize: 22, fontWeight: 800 }}>
            프로모션을 찾을 수 없습니다
          </Typography>
          <Typography sx={{ mt: 1, color: colors.textSecondary, fontSize: 15 }}>
            종료되었거나 공개되지 않은 프로모션일 수 있습니다.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        px: { xs: 2, md: 5 },
        py: { xs: 3, md: 5 },
        background:
          `linear-gradient(135deg, ${colors.background} 0%, ${colors.aqua} 45%, ${colors.backgroundWarm} 100%)`,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 920,
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
        }}
      >
        {promotion.bannerImageUrl && (
          <Box
            component="img"
            src={promotion.bannerImageUrl}
            alt={promotion.title || '프로모션 이미지'}
            sx={{
              width: '100%',
              maxHeight: { xs: 300, md: 420 },
              objectFit: 'cover',
              borderRadius: { xs: 3, md: 4 },
              border: `1px solid ${colors.border}`,
              boxShadow: '0 18px 44px rgba(31, 51, 43, 0.09)',
            }}
          />
        )}

        <Box
          sx={{
            p: { xs: 2.5, md: 4 },
            borderRadius: { xs: 3, md: 4 },
            border: `1px solid ${colors.border}`,
            bgcolor: 'rgba(255,255,255,0.82)',
            boxShadow: '0 18px 44px rgba(31, 51, 43, 0.07)',
          }}
        >
          <Typography
            variant="h3"
            sx={{
              color: colors.textPrimary,
              fontSize: { xs: 28, md: 38 },
              fontWeight: 900,
              lineHeight: 1.18,
              letterSpacing: 0,
            }}
          >
            {promotion.title}
          </Typography>

          {promotion.summary && (
            <Typography
              sx={{
                mt: 1.5,
                color: colors.textSecondary,
                fontSize: { xs: 15, md: 17 },
                lineHeight: 1.75,
              }}
            >
              {promotion.summary}
            </Typography>
          )}

          <Box
            sx={{
              mt: { xs: 3, md: 4 },
              ...getArticleContentSx(colors),
            }}
            dangerouslySetInnerHTML={{ __html: promotion.contentHtml || '' }}
          />

          {promotion.externalUrl && (
            <Button
              component="a"
              href={promotion.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              endIcon={<OpenInNewRoundedIcon />}
              sx={{ mt: { xs: 3, md: 4 }, borderRadius: 999, px: 3 }}
            >
              {promotion.externalLinkText || '자세히 보기'}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default PromotionDetail;
