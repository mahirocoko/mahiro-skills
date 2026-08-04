interface IToolItem {
  label?: unknown;
  disabled?: unknown;
}

interface IToolProbe {
  success?: unknown;
  error?: unknown;
  items?: unknown;
}

export function requireDeepResearchToolLabel(value: unknown): string {
  const probe = value && typeof value === "object" ? (value as IToolProbe) : {};
  if (probe.success !== true) {
    throw new Error(`Deep Research capability probe failed: ${String(probe.error || "unknown error")}`);
  }

  const items = Array.isArray(probe.items) ? (probe.items as IToolItem[]) : [];
  const tool = items.find((item) => {
    const label = typeof item.label === "string"
      ? item.label.replace(/\s+/g, " ").trim().toLowerCase()
      : "";
    return label === "deep research" && item.disabled !== true;
  });

  if (!tool || typeof tool.label !== "string") {
    throw new Error("Deep Research tool is not available on this account/tab; refusing ordinary-chat fallback.");
  }

  return tool.label;
}
