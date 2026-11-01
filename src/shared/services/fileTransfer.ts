import type { InjectionKey } from 'vue'

export interface UploadedAsset {
  fileId: string
  name: string
  size: number
  category: string
  durationMs: number
  playbackStatus?: 'ready' | null
  playbackProfile?: string | null
  thumbnailStatus?: 'ready' | 'failed' | null
}

export interface FileTransferOptions {
  signal: AbortSignal
  onProgress: (progress: { loaded: number; total?: number; percent?: number }) => void
  onStage?: (stage: 'validating') => void
}

/** Ephemeral access lease; optional metadata keeps existing transport consumers compatible. */
export interface FileAccessAsset {
  url: string
  expiresAt: string
  name?: string
  size?: number
  contentType?: string
  category?: string
  playbackStatus?: 'ready' | 'unprocessed' | null
  playbackProfile?: string | null
  thumbnailStatus?: 'ready' | 'failed' | null
  thumbnailUrl?: string | null
  thumbnailExpiresAt?: string | null
}

export interface FileTransferGateway {
  scope: () => string
  createTask: (
    file: File,
    category: string,
  ) => {
    run: (options: FileTransferOptions) => Promise<UploadedAsset>
  }
  access: (fileId: string, signal: AbortSignal) => Promise<FileAccessAsset>
}

// Only the production shell provides a gateway. UIDesign stays offline.
export const fileTransferKey: InjectionKey<FileTransferGateway> = Symbol('file-transfer')
