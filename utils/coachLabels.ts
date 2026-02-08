export const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    head: "Head Coach",
    assistant: "Assistant Coach",
    recruiting: "Recruiting Coordinator",
  };
  return labels[role] || role;
};
