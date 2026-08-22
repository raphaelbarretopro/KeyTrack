import QRCode from 'qrcode'

export const generateQrCodeDataUrl = (value: string) =>
  QRCode.toDataURL(value, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 480,
    color: {
      dark: '#0f172a',
      light: '#ffffffff',
    },
  })
