// Design System Component Library
// Reusable Vue components matching the Figma design system

export { default as DSButton } from './Button.vue'
export { default as DSCard } from './Card.vue'
export { default as DSGradientCard } from './GradientCard.vue'
export { default as DSBadge } from './Badge.vue'
export { default as DSInput } from './Input.vue'
export { default as DSToast } from './Toast.vue'
export { default as DSEmptyState } from './EmptyState.vue'
export { default as DSLoadingSkeleton } from './LoadingSkeleton.vue'
export { default as DSErrorState } from './ErrorState.vue'
export { default as DSLoadingState } from './LoadingState.vue'
export { default as DSFilterChips } from './FilterChips.vue'
export { default as DSFieldError } from './FieldError.vue'

// Re-export types for external use
export type { ButtonVariant, ButtonColor, ButtonSize } from './Button.vue'
export type { CardPadding } from './Card.vue'
export type { GradientColor } from './GradientCard.vue'
export type { BadgeColor, BadgeVariant, BadgeSize } from './Badge.vue'
export type { InputSize } from './Input.vue'
export type { Toast, ToastType } from '~/types/toast'
export type { LoadingStateVariant } from './LoadingState.vue'
export type {
  FilterType,
  FilterValue,
  FilterOption,
  FilterConfig,
  DateRangePreset,
  FilterValues,
  FilterPreset,
  FilterState,
  UseUniversalFilterOptions,
} from '~/types/filters'
