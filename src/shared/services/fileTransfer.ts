import type { InjectionKey } from 'vue'

export interface UploadedAsset {
  fileId: string
  name: string
  size: number
  category: string
  durationMs: number
}

export interface FileTransferOptions {
  signal: AbortSignal
  onProgress: (progress: { loaded: number; total?: number; percent?: number }) => void
}

export interface FileTransferGateway {
  scope: () => string
  createTask: (
    file: File,
    category: string,
  ) => {
    run: (options: FileTransferOptions) => Promise<UploadedAsset>
  }
  access: (fileId: string, signal: AbortSignal) => Promise<{ url: string; expiresAt: string }>
}

// Only the production shell provides a gateway. UIDesign stays offline.
export const fileTransferKey: InjectionKey<FileTransferGateway> = Symbol('file-transfer')
