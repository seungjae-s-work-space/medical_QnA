import { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { colors } from '../theme';
import { getPublishedPromotions } from '../services/promotionService';

const AUTO_ROTATE_MS = 5200;

function PromotionCarousel() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    getPublishedPromotions()
      .then((promotionList) => {
        if (!isMounted) return;
        setPromotions(promotionList);
        setCurrentIndex(0);
      })
      .catch((error) => {
        console.error('Promotion load error:', error);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (promotions.length <= 1) {
      return undefined;
    }

    const timer = setInterval(() => {
      setCurrentIndex((index) => (index + 1) % promotions.length);
    }, AUTO_ROTATE_MS);

    return () => clearInterval(timer);
  }, [promotions.length]);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: { xs: 56, md: 72 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={22} sx={{ color: colors.primaryDark }} />
      </Box>
    );
  }

  if (promotions.length === 0) {
    return null;
  }

  const promotion = promotions[currentIndex] || promotions[0];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box
        component="button"
        type="button"
        onClick={() => navigate(`/promotions/${promotion.id}`)}
        aria-label={`${promotion.title || '프로모션'} 자세히 보기`}
        sx={{
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          aspectRatio: { xs: '3 / 1', md: '6 / 1' },
          minHeight: { xs: 112, sm: 128, md: 148 },
          p: 0,
          border: `1px solid ${colors.border}`,
          borderRadius: { xs: 3, md: 4 },
          bgcolor: colors.primaryLight,
          boxShadow: '0 16px 40px rgba(31, 51, 43, 0.09)',
          cursor: 'pointer',
          font: 'inherit',
          textAlign: 'left',
          transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            borderColor: colors.primary,
            boxShadow: '0 20px 48px rgba(31, 51, 43, 0.13)',
          },
        }}
      >
        {promotion.bannerImageUrl && (
          <Box
            component="img"
            src={promotion.bannerImageUrl}
            alt=""
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, rgba(31,51,43,0.64) 0%, rgba(31,51,43,0.24) 50%, rgba(31,51,43,0.04) 100%)',
          }}
        />
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            px: { xs: 2, md: 3 },
            py: { xs: 1.5, md: 2 },
            maxWidth: { xs: '82%', md: '62%' },
          }}
        >
          <Typography
            sx={{
              color: 'white',
              fontSize: { xs: 18, sm: 22, md: 26 },
              fontWeight: 900,
              lineHeight: 1.2,
              letterSpacing: 0,
              textShadow: '0 2px 10px rgba(31, 51, 43, 0.28)',
            }}
          >
            {promotion.title}
          </Typography>
          {promotion.summary && (
            <Typography
              sx={{
                mt: 0.75,
                color: 'rgba(255,255,255,0.9)',
                fontSize: { xs: 13, md: 15 },
                lineHeight: 1.45,
                display: { xs: 'none', sm: '-webkit-box' },
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {promotion.summary}
            </Typography>
          )}
        </Box>
      </Box>

      {promotions.length > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.75 }}>
          {promotions.map((item, index) => (
            <Box
              key={item.id}
              component="button"
              type="button"
              aria-label={`${index + 1}번 프로모션 보기`}
              onClick={() => setCurrentIndex(index)}
              sx={{
                width: index === currentIndex ? 22 : 8,
                height: 8,
                borderRadius: 999,
                border: 0,
                p: 0,
                bgcolor: index === currentIndex ? colors.primaryDark : colors.border,
                cursor: 'pointer',
                transition: 'width 0.18s ease, background-color 0.18s ease',
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

export default PromotionCarousel;
