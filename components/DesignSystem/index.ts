// Design System Component Library
// Reusable Vue components matching the Figma design system.
//
// Architecture (use these layers, don't skip):
// 1. Primitives — Button, Badge, Input, Card, Alert
// 2. Overlays — Modal, ConfirmDialog, Toast
// 3. Async states — LoadingState, EmptyState, ErrorState, PageState, skeletons
// 4. Navigation — Pagination, FilterChips
// 5. Forms — DesignSystemForm*
//
// In templates, use path-derived tags: <DesignSystemButton>, not <DSButton>.
// The DS* aliases below are for explicit `import { DSButton }` only.

export { default as DSButton } from "./Button.vue";
export { default as DSCard } from "./Card.vue";
export { default as DSGradientCard } from "./GradientCard.vue";
export { default as DSBadge } from "./Badge.vue";
export { default as DSInput } from "./Input.vue";
export { default as DSToast } from "./Toast.vue";
export { default as DSEmptyState } from "./EmptyState.vue";
export { default as DSLoadingSkeleton } from "./LoadingSkeleton.vue";
export { default as DSErrorState } from "./ErrorState.vue";
export { default as DSLoadingState } from "./LoadingState.vue";
export { default as DSFilterChips } from "./FilterChips.vue";
export { default as DSFieldError } from "./FieldError.vue";
export { default as DSCardSkeleton } from "./CardSkeleton.vue";
export { default as DSChartSkeleton } from "./ChartSkeleton.vue";
export { default as DSListSkeleton } from "./ListSkeleton.vue";
export { default as DSAnimatedCheck } from "./Form/AnimatedCheck.vue";
export { default as DSAlert } from "./Alert.vue";
export { default as DSModal } from "./Modal.vue";
export { default as DSPagination } from "./Pagination.vue";
export { default as DSPageState } from "./PageState.vue";

// Re-export types for external use
export type { ButtonVariant, ButtonColor, ButtonSize } from "./Button.vue";
export type { CardPadding } from "./Card.vue";
export type { GradientColor } from "./GradientCard.vue";
export type { BadgeColor, BadgeVariant, BadgeSize } from "./Badge.vue";
export type { InputSize } from "./Input.vue";
export type { AnimatedCheckSize } from "./Form/AnimatedCheck.vue";
export type { Toast, ToastType } from "~/types/toast";
export type { LoadingStateVariant } from "./LoadingState.vue";
export type { AlertVariant } from "./Alert.vue";
export type { ModalSize, ModalTone } from "./Modal.vue";
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
} from "~/types/filters";
