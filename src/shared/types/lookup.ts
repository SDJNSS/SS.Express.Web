export interface LookupOption {
  value: string
  label: string
  secondary?: string
}

export type LookupKind = 'vehicle' | 'driver' | 'customer' | 'organization' | 'user' | 'address'
