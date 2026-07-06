import React from "react";

export const shellStyles = {
  app: {
    height: "100vh",
    maxHeight: "100vh",
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr) auto",
    overflow: "hidden",
    background: "#f4f4f5",
    color: "#18181b",
    fontFamily: "Inter, system-ui, sans-serif"
  },
  header: {
    display: "flex",
    flexWrap: "wrap" as const,
    justifyContent: "space-between",
    gap: "1rem",
    alignItems: "center",
    padding: "0.8rem 1rem",
    background: "#18202a",
    color: "#f8fafc"
  },
  heading: {
    margin: 0,
    fontSize: "1.2rem"
  },
  tabs: {
    display: "flex",
    gap: "0.5rem"
  },
  tab: {
    borderRadius: "8px",
    border: "1px solid #52525b",
    background: "transparent",
    color: "#f8fafc",
    padding: "0.55rem 0.75rem",
    fontWeight: 700
  },
  tabActive: {
    borderRadius: "8px",
    border: "1px solid #99f6e4",
    background: "#ecfdf5",
    color: "#064e3b",
    padding: "0.55rem 0.75rem",
    fontWeight: 700
  },
  content: {
    minHeight: 0,
    overflow: "auto",
    padding: "1rem",
    boxSizing: "border-box" as const
  },
  developerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(280px, 1fr))",
    gap: "1rem",
    alignItems: "start"
  },
  catalogColumn: {
    display: "grid",
    gap: "0.75rem",
    alignContent: "start",
    minHeight: "0",
    overflow: "auto"
  },
  profileColumn: {
    display: "grid",
    gap: "1rem",
    alignContent: "start",
    minHeight: "0",
    overflow: "auto"
  },
  runInspectorColumn: {
    display: "grid",
    gap: "0.75rem",
    alignContent: "start",
    minHeight: "0",
    overflow: "auto"
  },
  commandBar: {
    display: "grid",
    gap: "0.5rem",
    minHeight: 0,
    borderTop: "1px solid #d4d4d8",
    background: "#ffffff",
    padding: "0.75rem 1rem",
    boxShadow: "0 -12px 30px rgba(24, 24, 27, 0.06)"
  },
  messageLog: {
    display: "grid",
    gap: "0.35rem",
    maxHeight: "5.75rem",
    overflow: "auto",
    listStyle: "none",
    padding: 0,
    margin: 0
  },
  message: {
    display: "grid",
    gridTemplateColumns: "4rem minmax(0, 1fr)",
    gap: "0.5rem",
    alignItems: "baseline",
    fontSize: "0.9rem"
  },
  chatPanel: {
    border: "1px solid #d4d4d8",
    borderRadius: "8px",
    padding: "1rem",
    background: "#ffffff"
  },
  portabilityPanel: {
    border: "1px solid #d4d4d8",
    borderRadius: "8px",
    padding: "1rem",
    background: "#ffffff",
    display: "grid",
    gap: "0.75rem"
  },
  portabilityActions: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.5rem",
    alignItems: "center"
  },
  portabilityField: {
    display: "grid",
    gap: "0.35rem"
  },
  fieldLabel: {
    fontWeight: 700,
    fontSize: "0.875rem"
  },
  portabilityTextarea: {
    width: "100%",
    boxSizing: "border-box" as const,
    minHeight: "7rem",
    resize: "vertical" as const,
    border: "1px solid #a1a1aa",
    borderRadius: "8px",
    padding: "0.65rem",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "0.78rem",
    lineHeight: 1.35,
    color: "#18181b",
    background: "#fafafa"
  },
  portabilityStatus: {
    margin: 0,
    color: "#0f766e",
    fontWeight: 700
  },
  catalogPanel: {
    border: "1px solid #d4d4d8",
    borderRadius: "8px",
    padding: "1rem",
    background: "#ffffff",
    display: "grid",
    gap: "0.75rem"
  },
  catalogGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 13rem), 1fr))",
    gap: "0.75rem"
  },
  catalogHeading: {
    margin: 0,
    fontSize: "0.92rem",
    color: "#3f3f46"
  },
  catalogList: {
    display: "grid",
    gap: "0.4rem",
    listStyle: "none",
    margin: 0,
    padding: 0
  },
  catalogItem: {
    display: "grid",
    gap: "0.2rem",
    minHeight: "4.3rem",
    border: "1px solid #e4e4e7",
    borderRadius: "8px",
    padding: "0.55rem",
    background: "#fafafa",
    color: "#18181b"
  },
  catalogMeta: {
    fontSize: "0.78rem",
    color: "#52525b",
    overflowWrap: "anywhere" as const
  },
  catalogEmpty: {
    margin: 0,
    color: "#52525b"
  },
  commandForm: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.5rem",
    alignItems: "center"
  },
  commandLabelGroup: {
    position: "relative" as const,
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    whiteSpace: "nowrap" as const
  },
  commandLabel: {
    fontWeight: 700,
    whiteSpace: "nowrap" as const
  },
  tipAnchor: {
    position: "relative" as const,
    display: "inline-flex",
    alignItems: "center"
  },
  tipButton: {
    width: "1.35rem",
    height: "1.35rem",
    borderRadius: "999px",
    border: "1px solid #0f766e",
    background: "#ecfdf5",
    color: "#064e3b",
    fontWeight: 800,
    lineHeight: 1,
    cursor: "help"
  },
  tipPanel: {
    position: "absolute" as const,
    left: 0,
    bottom: "calc(100% + 0.5rem)",
    zIndex: 5,
    width: "min(28rem, calc(100vw - 2rem))",
    display: "grid",
    gap: "0.35rem",
    border: "1px solid #0f766e",
    borderRadius: "8px",
    background: "#f8fafc",
    color: "#18181b",
    boxShadow: "0 18px 40px rgba(24, 24, 27, 0.18)",
    padding: "0.65rem 0.75rem",
    whiteSpace: "normal" as const
  },
  tipLine: {
    margin: 0,
    fontSize: "0.86rem",
    lineHeight: 1.35
  },
  commandInput: {
    flex: "1 1 16rem",
    minWidth: "min(100%, 16rem)",
    borderRadius: "8px",
    border: "1px solid #a1a1aa",
    background: "#ffffff",
    color: "#18181b",
    padding: "0.75rem"
  },
  inputSourceGroup: {
    display: "inline-grid",
    gridTemplateColumns: "1fr 1fr",
    minWidth: "9rem",
    border: "1px solid #a1a1aa",
    borderRadius: "8px",
    overflow: "hidden"
  },
  inputSourceButton: {
    minHeight: "2.6rem",
    border: 0,
    background: "#ffffff",
    color: "#3f3f46",
    padding: "0.55rem 0.75rem",
    fontWeight: 700
  },
  inputSourceButtonActive: {
    minHeight: "2.6rem",
    border: 0,
    background: "#dbeafe",
    color: "#1e3a8a",
    padding: "0.55rem 0.75rem",
    fontWeight: 800
  },
  primaryButton: {
    borderRadius: "8px",
    border: 0,
    padding: "0.75rem 1rem",
    background: "#0f766e",
    color: "#ffffff",
    fontWeight: 700,
    whiteSpace: "nowrap" as const
  },
  secondaryButton: {
    borderRadius: "8px",
    border: "1px solid #d97706",
    padding: "0.75rem 1rem",
    background: "#fff7ed",
    color: "#92400e",
    fontWeight: 700,
    whiteSpace: "nowrap" as const
  },
  emptyState: {
    minHeight: "10rem",
    border: "1px dashed #a1a1aa",
    borderRadius: "8px",
    padding: "1rem",
    display: "grid",
    placeItems: "center",
    background: "#ffffff"
  },
  summaryPanel: {
    border: "1px solid #d4d4d8",
    borderRadius: "8px",
    padding: "1rem",
    background: "#ffffff"
  },
  componentPanel: {
    border: "1px solid #d4d4d8",
    borderRadius: "8px",
    padding: "1rem",
    background: "#ffffff"
  },
  componentList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 13rem), 1fr))",
    gap: "0.5rem",
    listStyle: "none",
    padding: 0,
    margin: 0
  },
  componentButton: {
    width: "100%",
    minHeight: "6rem",
    textAlign: "left" as const,
    borderRadius: "8px",
    border: "1px solid #d4d4d8",
    background: "#fafafa",
    color: "#18181b",
    padding: "0.75rem",
    display: "grid",
    alignContent: "start",
    gap: "0.35rem"
  },
  componentButtonActive: {
    width: "100%",
    minHeight: "6rem",
    textAlign: "left" as const,
    borderRadius: "8px",
    border: "2px solid #0f766e",
    background: "#ecfdf5",
    color: "#064e3b",
    padding: "0.6875rem",
    display: "grid",
    alignContent: "start",
    gap: "0.35rem"
  },
  componentName: {
    overflowWrap: "anywhere" as const
  },
  componentMeta: {
    fontSize: "0.875rem",
    color: "#52525b",
    overflowWrap: "anywhere" as const
  },
  componentToolLine: {
    fontSize: "0.8125rem",
    color: "#0f766e",
    overflowWrap: "anywhere" as const
  },
  timelineList: {
    display: "grid",
    gap: "0.5rem",
    listStyle: "none",
    padding: 0,
    margin: 0
  },
  timelineItem: {
    display: "grid",
    gap: "0.35rem"
  },
  timelineButton: {
    width: "100%",
    textAlign: "left" as const,
    borderRadius: "8px",
    border: "1px solid #d4d4d8",
    background: "#ffffff",
    color: "#18181b",
    padding: "0.75rem",
    display: "grid",
    gap: "0.35rem"
  },
  timelineButtonActive: {
    width: "100%",
    textAlign: "left" as const,
    borderRadius: "8px",
    border: "2px solid #0f766e",
    background: "#ecfdf5",
    color: "#064e3b",
    padding: "0.75rem",
    display: "grid",
    gap: "0.35rem"
  },
  timelineMeta: {
    opacity: 0.75,
    fontSize: "0.875rem"
  },
  timelineEmpty: {
    margin: 0,
    color: "#52525b"
  },
  timelinePanel: {
    border: "1px solid #d4d4d8",
    borderRadius: "8px",
    padding: "1rem",
    background: "#ffffff",
    display: "grid",
    gap: "0.75rem"
  },
  detailPanel: {
    border: "1px solid #d4d4d8",
    borderRadius: "8px",
    padding: "1rem",
    background: "#ffffff"
  },
  detailPre: {
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const
  },
  error: {
    borderRadius: "8px",
    border: "1px solid #b91c1c",
    background: "#fef2f2",
    color: "#7f1d1d",
    padding: "0.75rem"
  }
} satisfies Record<string, React.CSSProperties>;
