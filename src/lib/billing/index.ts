import { stripeBillingProvider } from './stripe-provider'
import type { BillingProvider } from './types'

/** The active payment provider. Routes import this, never a provider directly. */
export const billing: BillingProvider = stripeBillingProvider
