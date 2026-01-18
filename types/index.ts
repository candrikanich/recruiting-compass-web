/**
 * Re-export commonly used types with shorter names
 */

import type { Database } from './database'
import type { Schools } from './database-helpers'
import type { School as SchoolModel } from './models'

export type School = SchoolModel

// Export other common types for convenience
export type { Schools } from './database-helpers'
export type { Database } from './database'