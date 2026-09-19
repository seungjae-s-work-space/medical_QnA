import { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { useParams } from 'react-router-dom';
import { colors } from '../theme';
import { getPromotion } from '../services/promotionService';
import { getArticleContentSx } from '../utils/articleContentStyles';

const BLOCKED_PROMOTION_SELECTOR = 'script, style, iframe, object, embed';

const ALLOWED_PROMOTION_TAGS = new Set([
  'A',
  'B',
  'BLOCKQUOTE',
  'BR',
  'DIV',
  'EM',
  'FIGCAPTION',
  'FIGURE',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'I',
  'IMG',
  'LI',
  'OL',
  'P',
  'S',
  'SPAN',
  'STRONG',
  'TABLE',
  'TBODY',
  'TD',
  'TH',
  'THEAD',
  'TR',
  'U',
  'UL',
]);

const GLOBAL_PROMOTION_ATTRIBUTES = new Set(['style', 'title']);
const PROMOTION_ATTRIBUTE_ALLOWLIST = {
  A: new Set(['href', 'rel', 'target']),
  IMG: new Set(['alt', 'height', 'src', 'width']),
};

const URI_PROMOTION_ATTRIBUTES = new Set(['href', 'src']);
const SCRIPT_URL_PROTOCOL = ['java', 'script:'].join('');
const STYLE_SCRIPT_URL_PATTERN = new RegExp(
  `(?:expression\\s*\\(|url\\s*\\(\\s*['"]?\\s*${SCRIPT_URL_PROTOCOL})`,
  'i'
);
const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:']);

function unwrapNode(node, documentRef) {
  const fragment = documentRef.createDocumentFragment();

  while (node.firstChild) {
    fragment.appendChild(node.firstChild);
  }

  node.replaceWith(fragment);
}

function isAllowedPromotionAttribute(element, name) {
  return (
    GLOBAL_PROMOTION_ATTRIBUTES.has(name) ||
    PROMOTION_ATTRIBUTE_ALLOWLIST[element.tagName]?.has(name)
  );
}

export function normalizePromotionExternalUrl(value) {
  if (typeof value !== 'string') {
    return '';
  }

  try {
    const url = new URL(value.trim());
    return ALLOWED_EXTERNAL_PROTOCOLS.has(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

export function sanitizePromotionHtml(html) {
  if (!html || typeof DOMParser === 'undefined') {
    return '';
  }

  const parser = new DOMParser();
  const parsedDocument = parser.parseFromString(html, 'text/html');

  parsedDocument.body.querySelectorAll(BLOCKED_PROMOTION_SELECTOR).forEach((node) => {
    node.remove();
  });

  Array.from(parsedDocument.body.querySelectorAll('*')).forEach((element) => {
    if (!ALLOWED_PROMOTION_TAGS.has(element.tagName)) {
      unwrapNode(element, parsedDocument);
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const normalizedUri = URI_PROMOTION_ATTRIBUTES.has(name)
        ? normalizePromotionExternalUrl(attribute.value)
        : null;
      // javascript: and data: are rejected by the absolute http/https allowlist above.
      const isUnsafeStyle = name === 'style' && STYLE_SCRIPT_URL_PATTERN.test(attribute.value);

      if (
        name.startsWith('on') ||
        !isAllowedPromotionAttribute(element, name) ||
        (URI_PROMOTION_ATTRIBUTES.has(name) && !normalizedUri) ||
        isUnsafeStyle
      ) {
        element.removeAttribute(attribute.name);
      } else if (normalizedUri) {
        element.setAttribute(attribute.name, normalizedUri);
      }
    });

    if (element.tagName === 'A' && element.getAttribute('href')) {
      element.setAttribute('target', '_blank');
      element.setAttribute('rel', 'noopener noreferrer');
    }
  });

  return parsedDocument.body.innerHTML;
}

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

  const sanitizedContentHtml = sanitizePromotionHtml(promotion.contentHtml || '');
  const normalizedExternalLinkUrl = normalizePromotionExternalUrl(promotion.externalLinkUrl);

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
            dangerouslySetInnerHTML={{ __html: sanitizedContentHtml }}
          />

          {normalizedExternalLinkUrl && (
            <Button
              component="a"
              href={normalizedExternalLinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              endIcon={<OpenInNewRoundedIcon />}
              sx={{ mt: { xs: 3, md: 4 }, borderRadius: 999, px: 3 }}
            >
              {promotion.externalLinkLabel || '자세히 보기'}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default PromotionDetail;
