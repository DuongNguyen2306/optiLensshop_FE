export const managementQueryKeys = {
  all: ["management"] as const,
  staff: () => [...managementQueryKeys.all, "staff"] as const,
  managers: () => [...managementQueryKeys.all, "managers"] as const,
};
