import type { DeadlineInfo, DeadlineUrgency } from "~/types/timeline";

export function calculateDeadlineInfo(deadlineDate: string | null): DeadlineInfo {
  if (!deadlineDate) {
    return {
      daysRemaining: null,
      urgency: "none",
      isPastDue: false,
      urgencyColor: "gray",
      urgencyLabel: "",
    };
  }

  const now = new Date();
  const deadline = new Date(deadlineDate);

  // Normalize to midnight for day comparison
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineMidnight = new Date(
    deadline.getFullYear(),
    deadline.getMonth(),
    deadline.getDate()
  );

  const diffMs = deadlineMidnight.getTime() - todayMidnight.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isPastDue = daysRemaining < 0;

  let urgency: DeadlineUrgency;
  if (isPastDue) {
    urgency = "critical";
  } else if (daysRemaining <= 3) {
    urgency = "critical";
  } else if (daysRemaining <= 7) {
    urgency = "urgent";
  } else if (daysRemaining <= 14) {
    urgency = "upcoming";
  } else {
    urgency = "future";
  }

  const urgencyColor = getUrgencyColor(urgency);
  const urgencyLabel = getUrgencyLabel(daysRemaining, isPastDue);

  return {
    daysRemaining,
    urgency,
    isPastDue,
    urgencyColor,
    urgencyLabel,
  };
}

export function formatDeadlineDate(deadlineDate: string | null): string {
  if (!deadlineDate) {
    return "";
  }

  const now = new Date();
  const deadline = new Date(deadlineDate);

  // Normalize to midnight for day comparison
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineMidnight = new Date(
    deadline.getFullYear(),
    deadline.getMonth(),
    deadline.getDate()
  );

  const diffMs = deadlineMidnight.getTime() - todayMidnight.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return "Overdue";
  } else if (daysRemaining === 0) {
    return "Today";
  } else if (daysRemaining === 1) {
    return "Tomorrow";
  } else {
    // Format as "Mon 15" or "Jan 15"
    const formatter = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    });
    return formatter.format(deadline);
  }
}

function getUrgencyColor(urgency: DeadlineUrgency): string {
  switch (urgency) {
    case "critical":
      return "red";
    case "urgent":
      return "orange";
    case "upcoming":
      return "yellow";
    case "future":
      return "gray";
    case "none":
      return "gray";
    default:
      return "gray";
  }
}

function getUrgencyLabel(daysRemaining: number, isPastDue: boolean): string {
  if (isPastDue) {
    return "Overdue";
  } else if (daysRemaining === 0) {
    return "Due Today";
  } else if (daysRemaining === 1) {
    return "Due Tomorrow";
  } else if (daysRemaining <= 3) {
    return `Due in ${daysRemaining} days`;
  } else {
    return "";
  }
}
