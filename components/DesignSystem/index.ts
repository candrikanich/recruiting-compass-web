// Design System Component Library
// Reusable Vue components matching the Figma design system

export { default as DSButton } from './Button.vue'
export { default as DSCard } from './Card.vue'
export { default as DSGradientCard } from './GradientCard.vue'
export { default as DSBadge } from './Badge.vue'
export { default as DSInput } from './Input.vue'

// Re-export types for external use
export type { ButtonVariant, ButtonColor, ButtonSize } from './Button.vue'
export type { CardPadding } from './Card.vue'
export type { GradientColor } from './GradientCard.vue'
export type { BadgeColor, BadgeVariant, BadgeSize } from './Badge.vue'
export type { InputSize } from './Input.vue'
