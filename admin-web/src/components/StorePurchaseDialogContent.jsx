import { Box, Button, Typography } from '@mui/material';
import PhoneIphoneRoundedIcon from '@mui/icons-material/PhoneIphoneRounded';
import { colors } from '../theme';

const IOS_APP_STORE_URL =
  'https://apps.apple.com/us/app/%EB%82%9C%EC%9E%84%EC%83%81%EB%8B%B4%ED%86%A1%ED%86%A1/id6759237772';
const ANDROID_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=net.agisungong.nanimtalktalk&hl=ko';

const STORE_LINKS = [
  {
    id: 'ios',
    label: 'iOS 앱',
    storeName: 'App Store',
    buttonLabel: 'App Store 열기',
    url: IOS_APP_STORE_URL,
  },
  {
    id: 'android',
    label: 'Android 앱',
    storeName: 'Google Play',
    buttonLabel: 'Google Play 열기',
    url: ANDROID_PLAY_STORE_URL,
  },
];

const getQrImageUrl = (url) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(url)}`;

function StorePurchaseDialogContent({ onClose }) {
  return (
    <Box sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
      <Box
        sx={{
          width: 64,
          height: 64,
          mx: 'auto',
          mb: 2,
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.primary,
          backgroundColor: colors.primaryLight,
        }}
      >
        <PhoneIphoneRoundedIcon sx={{ fontSize: 34 }} />
      </Box>

      <Typography sx={{ fontSize: 22, fontWeight: 700, color: colors.textPrimary, mb: 1.5 }}>
        이용권이 필요합니다
      </Typography>

      <Typography
        sx={{
          fontSize: 14,
          color: colors.textSecondary,
          lineHeight: 1.8,
          maxWidth: 420,
          mx: 'auto',
          mb: 3,
        }}
      >
        이 콘텐츠는 이용권 구매 후 볼 수 있습니다.
        <br />
        아래 QR을 스캔하거나 앱스토어로 이동해 난임상담톡톡 앱을 설치해 주세요.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
          mb: 3,
          textAlign: 'left',
        }}
      >
        {STORE_LINKS.map((store) => (
          <Box
            key={store.id}
            sx={{
              p: 2.25,
              borderRadius: 3,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.card,
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
            }}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: colors.primary, mb: 0.5 }}>
              {store.label}
            </Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: colors.textPrimary, mb: 1.5 }}>
              {store.storeName}
            </Typography>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                p: 1.5,
                mb: 1.5,
                borderRadius: 2.5,
                backgroundColor: '#FFFFFF',
                border: `1px solid ${colors.border}`,
              }}
            >
              <Box
                component="img"
                src={getQrImageUrl(store.url)}
                alt={`${store.storeName} QR 코드`}
                sx={{
                  width: 160,
                  height: 160,
                  display: 'block',
                }}
              />
            </Box>

            <Typography sx={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.6, mb: 1.5 }}>
              카메라로 QR을 스캔하거나 아래 버튼으로 바로 이동할 수 있습니다.
            </Typography>

            <Button
              component="a"
              href={store.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              fullWidth
            >
              {store.buttonLabel}
            </Button>
          </Box>
        ))}
      </Box>

      <Button variant="contained" onClick={onClose}>
        확인
      </Button>
    </Box>
  );
}

export default StorePurchaseDialogContent;
