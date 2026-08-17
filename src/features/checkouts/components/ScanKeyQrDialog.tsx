import { Modal } from '../../../components/shared/Modal'
import { QrScannerPanel } from './QrScannerPanel'

interface ScanKeyQrDialogProps {
  onClose: () => void
  onScan: (qrCodeId: string) => void
}

export const ScanKeyQrDialog = ({ onClose, onScan }: ScanKeyQrDialogProps) => {
  return (
    <Modal title="Ler QR code da chave" onClose={onClose}>
      <QrScannerPanel onScan={onScan} />
    </Modal>
  )
}