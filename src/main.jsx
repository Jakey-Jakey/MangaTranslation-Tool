import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const Streamdown = React.lazy(() => import("streamdown").then((module) => ({ default: module.Streamdown })));

const DEFAULT_MODEL = "google/gemini-3.1-pro-preview";
const LANGUAGES = ["Auto", "Japanese", "Korean", "Chinese", "English", "Spanish", "French", "German", "Italian", "Portuguese"];
const REASONING_EFFORTS = ["none", "minimal", "low", "medium", "high", "xhigh"];
const GUIDE_SECTIONS = ["Character names", "Honorifics", "Recurring terms", "Tone", "SFX treatment"];
const PASS_TEMPLATES = [
  { id: "full-page", label: "Full page", title: "Full page pass", prompt: "Analyze the full attached page. Produce the structured translation pass first, then detailed line-by-line localization notes." },
  { id: "crop-queue", label: "Crop queue", title: "Crop queue pass", prompt: "Analyze the attached crop queue in order. Preserve the crop order and produce one structured item per visible text region." },
  { id: "line-refine", label: "Line refine", title: "Line refinement pass", prompt: "Focus on the selected line or crop. Give alternative translations, explain nuance, and recommend a polished final wording." },
  { id: "terms", label: "Terminology", title: "Terminology pass", prompt: "Extract names, recurring terms, honorific choices, SFX handling notes, and style-guide rules worth adding to the Project Guide." },
];

const iconPaths = {
  logo: "M4 4h16v16H4z M8 8h8v2H8z M8 12h8v2H8z M8 16h5v2H8z",
  reading: "M5 4h6a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H5z M14 7a3 3 0 0 1 3-3h2v13h-2a3 3 0 0 0-3 3z",
  type: "M4 5h16v3h-6v11h-4V8H4z",
  sparkle: "M12 2l2.6 6.7L21 12l-6.4 3.3L12 22l-2.6-6.7L3 12l6.4-3.3z",
  download: "M12 3v11m0 0 4-4m-4 4-4-4 M5 19h14",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M4 12h2m12 0h2M12 4v2m0 12v2M6.3 6.3l1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4m-8.6 8.6-1.4 1.4",
  plus: "M12 5v14M5 12h14",
  close: "M6 6l12 12M18 6 6 18",
  folder: "M3 6h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  image: "M4 5h16v14H4z M7 16l4-4 3 3 2-2 3 3 M8 9h.1",
  archive: "M6 3h12v18H6z M9 3v18 M9 6h3M9 10h3M9 14h3",
  pdf: "M6 3h9l3 3v15H6z M9 15h6M9 18h4M14 3v4h4",
  cursor: "M5 3l12 10-6 1-3 6z",
  rectangle: "M4 6h16v12H4z",
  hand: "M8 12V5a1.5 1.5 0 0 1 3 0v6-4a1.5 1.5 0 0 1 3 0v5-3a1.5 1.5 0 0 1 3 0v4l1-1a1.5 1.5 0 0 1 2 2l-3 5a5 5 0 0 1-4 2h-2a5 5 0 0 1-4-3l-2-5a1.5 1.5 0 0 1 3-1z",
  queue: "M4 7h12M4 12h16M4 17h9",
  zoomIn: "M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12z M11 8v6M8 11h6 M16 16l4 4",
  zoomOut: "M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12z M8 11h6 M16 16l4 4",
  fit: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5",
  layers: "M12 3l9 5-9 5-9-5z M3 12l9 5 9-5M3 16l9 5 9-5",
  grid: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  book: "M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3-3z M5 4v13",
  send: "M3 20l18-8L3 4v6l11 2-11 2z",
  chat: "M4 5h16v11H8l-4 4z",
  keyboard: "M3 6h18v12H3z M6 10h.1M9 10h.1M12 10h.1M15 10h.1M18 10h.1M7 14h10",
  dots: "M6 12h.1M12 12h.1M18 12h.1",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18",
  chevronDown: "M6 9l6 6 6-6",
  chevronRight: "M9 6l6 6-6 6",
  chevronLeft: "M15 6l-6 6 6 6",
  check: "M5 12l4 4L19 6",
  trash: "M5 7h14M10 11v6M14 11v6M8 7l1-3h6l1 3M7 7l1 14h8l1-14",
  pencil: "M4 20l4-1 11-11-3-3L5 16z",
  copy: "M8 8h11v11H8z M5 5h11v3H8v8H5z",
  key: "M7 14a4 4 0 1 1 3.5-6H21v4h-3v3h-4v-3h-3.5A4 4 0 0 1 7 14z",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 11v6M12 7h.1",
};

function Icon({ name, size = 14, className = "" }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={iconPaths[name] || iconPaths.info} />
    </svg>
  );
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data.error || response.statusText);
  return data;
}

function fileUrl(relativePath, cacheKey = "") {
  const params = new URLSearchParams({ path: relativePath || "" });
  if (cacheKey) params.set("v", cacheKey);
  return `/api/file?${params.toString()}`;
}

function classNames(...items) {
  return items.filter(Boolean).join(" ");
}

function clampPanelWidth(value) {
  return Math.max(280, Math.min(620, Math.round(Number(value) || 340)));
}

function pathTail(value) {
  return String(value || "").split(/[\\/]/).pop();
}

function compactNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "?";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function modelLabel(model) {
  return model?.name || model?.label || model?.id || DEFAULT_MODEL;
}

function modelLabelForId(modelId, models = []) {
  if (!modelId) return "";
  return modelLabel(models.find((item) => item.id === modelId) || { id: modelId });
}

function defaultChatPrompt() {
  return "Please produce the structured translation pass first, then the detailed line-by-line localization analysis.";
}

function attachmentSummary(attachments) {
  if (!attachments?.length) return "";
  const pages = attachments.filter((item) => item.type === "page").length;
  const crops = attachments.filter((item) => item.type === "crop").length;
  if (pages && crops) return `Attached ${pages} page${pages === 1 ? "" : "s"} and ${crops} crop${crops === 1 ? "" : "s"}.`;
  if (pages) return `Attached ${pages === 1 ? "current page" : `${pages} pages`}.`;
  return `Attached ${crops === 1 ? "selected crop" : `${crops} crops`}.`;
}

function progressCounts(page) {
  const total = Number(page?.line_count || 0);
  const drafted = Number(page?.draft_count || 0);
  const final = Number(page?.final_count || 0);
  return { total, drafted, final, status: page?.status || "untranslated" };
}

function progressLabel(page) {
  const { total, drafted, final } = progressCounts(page);
  if (!total) return "No lines";
  if (final >= total) return `Final ${final}/${total}`;
  if (drafted >= total) return `Final ${final}/${total}`;
  return `Drafted ${drafted}/${total} · Final ${final}/${total}`;
}

function guideSummary(decisions = []) {
  const categories = [...new Set(decisions.map((row) => row.category).filter(Boolean))];
  if (!decisions.length) return "Project Guide · empty";
  return `Project Guide · ${decisions.length} rule${decisions.length === 1 ? "" : "s"} · ${categories.slice(0, 3).join(", ")}${categories.length > 3 ? "..." : ""}`;
}

function guideShortSummary(decisions = []) {
  if (!decisions.length) return "Project Guide";
  return `Project Guide · ${decisions.length} rule${decisions.length === 1 ? "" : "s"}`;
}

const initialState = {
  workspaceRoot: "",
  defaultWorkspaceRoot: "",
  activeProject: null,
  projectProgress: null,
  projects: [],
  pages: [],
  page: null,
  crops: [],
  queue: [],
  scratchpad: [],
  chatSessions: [],
  activeChatSessionId: "",
  messages: [],
  settings: {},
  decisions: [],
  hasOpenRouterKey: false,
  legacyOpenRouterKeyAvailable: false,
  authError: "",
  keyInfo: null,
  models: [],
  selectedModel: DEFAULT_MODEL,
};

function App() {
  const [state, setState] = useState(initialState);
  const [mode, setMode] = useState("translation");
  const [tool, setTool] = useState("crop");
  const [selectedCropId, setSelectedCropId] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [workbenchView, setWorkbenchView] = useState("text");
  const [workbenchFilter, setWorkbenchFilter] = useState("all");
  const [modal, setModal] = useState("");
  const [toast, setToast] = useState("");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [chatText, setChatText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [modelQuery, setModelQuery] = useState("");
  const [visionOnly, setVisionOnly] = useState(true);
  const [importStatus, setImportStatus] = useState("");
  const [undoStack, setUndoStack] = useState([]);
  const [labelFocusCropId, setLabelFocusCropId] = useState("");
  const [panelWidths, setPanelWidths] = useState({ workbench: 340, chat: 360 });
  const [panelDrag, setPanelDrag] = useState(null);

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(""), 4200);
  };

  const confirmAction = ({ title, message, confirmLabel = "Confirm", danger = false }) => new Promise((resolve) => {
    setDialog({
      type: "confirm",
      title,
      message,
      confirmLabel,
      danger,
      onCancel: () => { setDialog(null); resolve(false); },
      onConfirm: () => { setDialog(null); resolve(true); },
    });
  });

  const promptAction = ({ title, message, placeholder = "", confirmLabel = "Continue" }) => new Promise((resolve) => {
    setDialog({
      type: "prompt",
      title,
      message,
      placeholder,
      value: "",
      confirmLabel,
      onCancel: () => { setDialog(null); resolve(""); },
      onConfirm: (value) => { setDialog(null); resolve(String(value || "").trim()); },
    });
  });

  const refresh = async ({ keepPage = false } = {}) => {
    const data = await api("/api/status");
    const currentPageId = state.page?.id;
    const nextPageId = keepPage && data.pages?.some((page) => page.id === currentPageId)
      ? currentPageId
      : data.pages?.[0]?.id;
    setState((s) => ({
      ...s,
      ...data,
      page: nextPageId ? s.page : null,
      crops: nextPageId ? s.crops : [],
      queue: nextPageId ? s.queue : [],
      scratchpad: nextPageId ? s.scratchpad : [],
      chatSessions: nextPageId ? s.chatSessions : [],
      activeChatSessionId: nextPageId ? s.activeChatSessionId : "",
      messages: nextPageId ? s.messages : [],
      selectedModel: data.settings?.defaultModel || DEFAULT_MODEL,
    }));
    if (data.activeProject && nextPageId) await loadPage(nextPageId, false);
  };

  const loadPage = async (pageId, clearSelection = true) => {
    const data = await api(`/api/page?id=${encodeURIComponent(pageId)}`);
    setState((s) => ({ ...s, ...data }));
    if (clearSelection) {
      setSelectedCropId("");
      setSelectedEntryId("");
      setAttachments([]);
    }
  };

  const createChatSession = async () => {
    if (!state.page) return;
    const data = await api("/api/chat/session", { method: "POST", body: JSON.stringify({ pageId: state.page.id, title: `Pass ${state.chatSessions.length + 1}` }) });
    setState((s) => ({ ...s, chatSessions: data.chatSessions, activeChatSessionId: data.activeChatSessionId, messages: data.messages || [] }));
    setAttachments([]);
  };

  const createTemplateSession = async (template) => {
    if (!state.page || !template) return;
    const data = await api("/api/chat/session", { method: "POST", body: JSON.stringify({ pageId: state.page.id, title: template.title }) });
    setState((s) => ({ ...s, chatSessions: data.chatSessions, activeChatSessionId: data.activeChatSessionId, messages: data.messages || [] }));
    setChatText(template.prompt);
    setAttachments([]);
    if (template.id === "full-page") addAttachment({ type: "page", id: state.page.id, name: state.page.file_name });
    if (template.id === "crop-queue") setAttachments(state.queue.map((crop) => ({ type: "crop", id: crop.id, name: crop.name || crop.label })));
    if (template.id === "line-refine" && selectedCrop) addAttachment({ type: "crop", id: selectedCrop.id, name: selectedCrop.name || selectedCrop.label });
  };

  const selectChatSession = async (sessionId) => {
    if (!state.page || !sessionId || sessionId === state.activeChatSessionId) return;
    const data = await api("/api/chat/session/select", { method: "POST", body: JSON.stringify({ pageId: state.page.id, sessionId }) });
    setState((s) => ({ ...s, chatSessions: data.chatSessions, activeChatSessionId: data.activeChatSessionId, messages: data.messages || [] }));
    setAttachments([]);
  };

  const renameChatSession = async (session, title) => {
    if (!session || !title?.trim()) return;
    const data = await api("/api/chat/session/rename", { method: "POST", body: JSON.stringify({ sessionId: session.id, title }) });
    setState((s) => ({ ...s, chatSessions: data.chatSessions, activeChatSessionId: data.activeChatSessionId, messages: data.messages || s.messages }));
  };

  const archiveChatSession = async (session) => {
    if (!session || !(await confirmAction({ title: "Archive Pass", message: `Archive ${session.title || "this chat pass"}?`, confirmLabel: "Archive" }))) return;
    const data = await api("/api/chat/session/archive", { method: "POST", body: JSON.stringify({ sessionId: session.id }) });
    setState((s) => ({ ...s, chatSessions: data.chatSessions, activeChatSessionId: data.activeChatSessionId, messages: data.messages || [] }));
    setAttachments([]);
    showToast("Chat pass archived.");
  };

  const deleteChatSession = async (session) => {
    if (!session || !(await confirmAction({ title: "Delete Pass", message: `Delete ${session.title || "this chat pass"}? Scratchpad text will be kept.`, confirmLabel: "Delete", danger: true }))) return;
    const data = await api("/api/chat/session/delete", { method: "POST", body: JSON.stringify({ sessionId: session.id }) });
    setState((s) => ({ ...s, chatSessions: data.chatSessions, activeChatSessionId: data.activeChatSessionId, messages: data.messages || [] }));
    setAttachments([]);
    showToast("Chat pass deleted.");
  };

  useEffect(() => {
    refresh().catch((error) => showToast(error.message));
    api("/api/models").then((data) => setState((s) => ({ ...s, models: data.data || [] }))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!state.activeProject) setModal("onboarding");
    else if (modal === "onboarding") setModal("");
  }, [state.activeProject]);

  useEffect(() => {
    if (!panelDrag) return;
    const onPointerMove = (event) => {
      const delta = panelDrag.startX - event.clientX;
      setPanelWidths({
        workbench: panelDrag.kind === "workbench" ? clampPanelWidth(panelDrag.workbench + delta) : panelDrag.workbench,
        chat: panelDrag.kind === "chat" ? clampPanelWidth(panelDrag.chat + delta) : panelDrag.chat,
      });
    };
    const onPointerUp = () => setPanelDrag(null);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [panelDrag]);

  const selectedCrop = state.crops.find((crop) => crop.id === selectedCropId) || null;
  const selectedEntry = state.scratchpad.find((entry) => entry.id === selectedEntryId) || state.scratchpad[0] || null;
  const selectedModel = state.models.find((model) => model.id === state.selectedModel) || { id: state.selectedModel, name: "Gemini 3.1 Pro" };

  const setSetting = async (patch) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch }, selectedModel: patch.defaultModel || s.selectedModel }));
    await api("/api/settings", { method: "POST", body: JSON.stringify(patch) });
  };

  const importFiles = async (files) => {
    if (!state.activeProject) return setModal("onboarding");
    if (!files.length) return;
    setBusy(true);
    setImportStatus("Reading files...");
    try {
      const payload = [];
      for (const file of files) {
        payload.push({ name: file.webkitRelativePath || file.name, dataUrl: await readFileDataUrl(file) });
      }
      setImportStatus("Importing into project...");
      const data = await api("/api/import/files", { method: "POST", body: JSON.stringify({ files: payload }) });
      setState((s) => ({ ...s, pages: data.pages }));
      const nextPage = data.pages.find((page) => page.id === state.page?.id) || data.pages[0];
      if (nextPage) await loadPage(nextPage.id);
      showToast(`Imported ${data.imported} page${data.imported === 1 ? "" : "s"}.`);
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusy(false);
      setImportStatus("");
    }
  };

  const importPath = async () => {
    const sourcePath = await promptAction({
      title: "Import Path",
      message: "Paste an image, folder, ZIP, CBZ, CBR, or PDF path to import.",
      placeholder: "C:\\Manga\\chapter-01.cbz",
      confirmLabel: "Import",
    });
    if (!sourcePath) return;
    setBusy(true);
    try {
      const data = await api("/api/import/path", { method: "POST", body: JSON.stringify({ path: sourcePath }) });
      setState((s) => ({ ...s, pages: data.pages }));
      const nextPage = data.pages.find((page) => page.id === state.page?.id) || data.pages[0];
      if (nextPage) await loadPage(nextPage.id);
      showToast(`Imported ${data.imported} page${data.imported === 1 ? "" : "s"}.`);
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusy(false);
    }
  };

  const createCrop = async (rect) => {
    if (!state.page) return;
    const label = nextCropLabel(state.crops);
    setBusy(true);
    try {
      const data = await api("/api/crops", { method: "POST", body: JSON.stringify({ pageId: state.page.id, name: label, label, type: labelType(label), ...rect }) });
      setState((s) => ({ ...s, crops: data.crops, queue: data.queue }));
      setSelectedCropId(data.crop?.id || "");
      setLabelFocusCropId(data.crop?.id || "");
      if (data.crop) setUndoStack((items) => [...items, { type: "createCrop", crop: data.crop }].slice(-40));
      showToast("Crop created. Rename it in the crop inspector.");
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusy(false);
    }
  };

  const saveScratchpad = async (entry) => {
    if (!state.page) return;
    const data = await api("/api/scratchpad", { method: "POST", body: JSON.stringify({ ...entry, pageId: state.page.id }) });
    setState((s) => ({
      ...s,
      page: data.page || s.page,
      pages: data.page ? s.pages.map((page) => page.id === data.page.id ? data.page : page) : s.pages,
      scratchpad: data.scratchpad,
    }));
    if (!entry.id && data.entry?.id) setSelectedEntryId(data.entry.id);
  };

  const deleteScratchpad = async (entry) => {
    if (!entry || !(await confirmAction({ title: "Delete Line", message: `Delete ${entry.label || "this line"} from the scratchpad?`, confirmLabel: "Delete", danger: true }))) return;
    const data = await api("/api/scratchpad/remove", { method: "POST", body: JSON.stringify({ entryId: entry.id }) });
    setState((s) => ({
      ...s,
      page: data.page || s.page,
      pages: data.page ? s.pages.map((page) => page.id === data.page.id ? data.page : page) : s.pages,
      scratchpad: data.scratchpad,
    }));
    setSelectedEntryId(data.scratchpad[0]?.id || "");
  };

  const addAttachment = (attachment) => {
    setAttachments((items) => items.some((item) => item.type === attachment.type && item.id === attachment.id) ? items : [...items, attachment]);
  };

  const queueCrop = async (crop, remove = false) => {
    const data = await api("/api/queue", { method: "POST", body: JSON.stringify({ cropId: crop.id, action: remove ? "remove" : "add" }) });
    setState((s) => ({ ...s, queue: data.queue, crops: data.crops || s.crops }));
  };

  const moveQueuedCrop = async (crop, direction) => {
    const index = state.queue.findIndex((item) => item.id === crop.id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= state.queue.length) return;
    const nextQueue = [...state.queue];
    [nextQueue[index], nextQueue[nextIndex]] = [nextQueue[nextIndex], nextQueue[index]];
    const data = await api("/api/queue/reorder", { method: "POST", body: JSON.stringify({ cropIds: nextQueue.map((item) => item.id) }) });
    setState((s) => ({ ...s, queue: data.queue, crops: data.crops || s.crops }));
  };

  const duplicateCrop = async (crop) => {
    if (!state.page || !crop) return;
    const label = nextCropLabel(state.crops);
    const offset = 24;
    const data = await api("/api/crops", {
      method: "POST",
      body: JSON.stringify({
        pageId: state.page.id,
        label,
        name: label,
        type: crop.type || labelType(label),
        x: Math.min(Math.max(0, crop.x + offset), Math.max(0, state.page.width - crop.width)),
        y: Math.min(Math.max(0, crop.y + offset), Math.max(0, state.page.height - crop.height)),
        width: crop.width,
        height: crop.height,
      }),
    });
    setState((s) => ({ ...s, queue: data.queue, crops: data.crops || s.crops }));
    setSelectedCropId(data.crop?.id || "");
    setLabelFocusCropId(data.crop?.id || "");
    if (data.crop) setUndoStack((items) => [...items, { type: "createCrop", crop: data.crop }].slice(-40));
    showToast("Duplicated crop.");
  };

  const updateCrop = async (crop, patch, options = {}) => {
    if (options.recordUndo !== false) setUndoStack((items) => [...items, { type: "updateCrop", before: crop }].slice(-40));
    const data = await api("/api/crops/update", { method: "POST", body: JSON.stringify({ cropId: crop.id, ...patch }) });
    setState((s) => ({ ...s, queue: data.queue, crops: data.crops || s.crops }));
    if (data.crop?.id) setSelectedCropId(data.crop.id);
  };

  const removeCrop = async (crop, options = {}) => {
    if (!crop) return;
    if (options.confirm !== false && !(await confirmAction({ title: "Delete Crop", message: `Delete crop ${crop.label || crop.name || "this crop"}?`, confirmLabel: "Delete", danger: true }))) return;
    const data = await api("/api/crops/remove", { method: "POST", body: JSON.stringify({ cropId: crop.id }) });
    setState((s) => ({ ...s, queue: data.queue, crops: data.crops || [] }));
    setSelectedCropId("");
    setAttachments((items) => items.filter((item) => item.id !== crop.id));
  };

  const deleteCrop = (crop) => removeCrop(crop);

  const undoLast = async () => {
    const action = undoStack.at(-1);
    if (!action) return showToast("Nothing to undo.");
    setUndoStack((items) => items.slice(0, -1));
    if (action.type === "createCrop") {
      await removeCrop(action.crop, { confirm: false });
      showToast("Undid crop placement.");
      return;
    }
    if (action.type === "updateCrop") {
      await updateCrop(action.before, {
        label: action.before.label,
        name: action.before.name,
        type: action.before.type,
        x: action.before.x,
        y: action.before.y,
        width: action.before.width,
        height: action.before.height,
      }, { recordUndo: false });
      showToast("Undid crop edit.");
    }
  };

  const clearChat = async (scope = "page") => {
    const text = scope === "project" ? "Clear all chat messages for this project?" : "Clear the current chat pass?";
    if (!(await confirmAction({ title: "Clear Chat", message: text, confirmLabel: "Clear", danger: true }))) return;
    const data = await api("/api/chat/clear", { method: "POST", body: JSON.stringify({ pageId: state.page?.id, sessionId: state.activeChatSessionId, scope }) });
    setState((s) => ({ ...s, chatSessions: data.chatSessions || s.chatSessions, activeChatSessionId: data.activeChatSessionId || s.activeChatSessionId, messages: data.messages || [] }));
    setAttachments([]);
  };

  const applyTranslationImport = async (message, undo = false) => {
    if (!message?.id) return;
    const data = await api(undo ? "/api/translation/unimport" : "/api/translation/import", {
      method: "POST",
      body: JSON.stringify({ chatMessageId: message.id }),
    });
    setState((s) => ({
      ...s,
      page: data.page || s.page,
      pages: data.page ? s.pages.map((page) => page.id === data.page.id ? data.page : page) : s.pages,
      scratchpad: data.scratchpad || s.scratchpad,
      messages: data.messages || s.messages,
    }));
    showToast(undo ? `Removed ${data.removed || 0} imported line${data.removed === 1 ? "" : "s"} from scratchpad.` : `Sent ${data.imported || 0} line${data.imported === 1 ? "" : "s"} to scratchpad.`);
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const key = event.key.toLowerCase();
      if (target?.closest?.("input, textarea, select, [contenteditable='true']")) return;
      if ((event.metaKey || event.ctrlKey) && !event.altKey && key === "z") {
        event.preventDefault();
        undoLast().catch((error) => showToast(error.message));
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (key === "v") setTool("cursor");
      if (key === "c") setTool("crop");
      if (key === "h") setTool("hand");
      if (key === "q" && selectedCrop) {
        event.preventDefault();
        const queued = state.queue.some((crop) => crop.id === selectedCrop.id);
        queueCrop(selectedCrop, queued).catch((error) => showToast(error.message));
      }
      if (selectedCrop && (key === "delete" || key === "backspace")) {
        event.preventDefault();
        deleteCrop(selectedCrop).catch((error) => showToast(error.message));
      }
      if (selectedCrop && ["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        event.preventDefault();
        const step = event.shiftKey ? 24 : 6;
        const patch = {
          x: selectedCrop.x + (key === "arrowleft" ? -step : key === "arrowright" ? step : 0),
          y: selectedCrop.y + (key === "arrowup" ? -step : key === "arrowdown" ? step : 0),
        };
        updateCrop(selectedCrop, patch).catch((error) => showToast(error.message));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedCrop?.id, selectedCrop?.x, selectedCrop?.y, state.queue, undoStack]);

  const sendChat = async (event) => {
    event?.preventDefault();
    const message = chatText.trim();
    if (!message && !attachments.length) return showToast("Attach a page or crop, or type a message first.");
    if (!state.hasOpenRouterKey) {
      setModal("account");
      return showToast("Connect OpenRouter, paste an API key, or use your legacy local key first.");
    }
    setBusy(true);
    setChatText("");
    const assistant = { id: `pending_${Date.now()}`, role: "assistant", content: "", model: state.selectedModel, created_at: new Date().toISOString() };
    setState((s) => ({ ...s, messages: [...s.messages, { id: `local_${Date.now()}`, role: "user", content: message, attachments_json: JSON.stringify(attachments), created_at: new Date().toISOString() }, assistant] }));
    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: state.page?.id,
          chatSessionId: state.activeChatSessionId,
          message,
          model: state.selectedModel,
          reasoningEffort: state.settings.reasoningEffort || "medium",
          sourceLanguage: state.settings.sourceLanguage || "Auto",
          targetLanguage: state.settings.targetLanguage || "English",
          attachments,
        }),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Chat request failed.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let content = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        setState((s) => ({ ...s, messages: s.messages.map((msg) => msg.id === assistant.id ? { ...msg, content } : msg) }));
      }
      if (!content.trim()) {
        throw new Error("The model connection ended before returning text. Try sending again, or choose another vision model.");
      }
      setAttachments([]);
      if (state.page) await loadPage(state.page.id, false);
    } catch (error) {
      setState((s) => ({
        ...s,
        messages: s.messages.map((msg) => msg.id === assistant.id ? { ...msg, role: "assistant error", content: error.message || "Chat request failed." } : msg),
      }));
      showToast(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell" data-theme="dark" data-density="balanced" style={{ "--accent": "#FF5A3C" }}>
      <Chrome
        mode={mode}
        setMode={setMode}
        project={state.activeProject}
        projectProgress={state.projectProgress}
        model={selectedModel}
        decisions={state.decisions}
        hasKey={state.hasOpenRouterKey}
        keyInfo={state.keyInfo}
        onProject={() => setModal("projects")}
        onGuide={() => setModal("decisions")}
        onModel={() => setModal("model")}
        onSettings={() => setModal("settings")}
        onExport={() => setModal("export")}
        onAccount={() => setModal("account")}
      />
      {mode === "translation" ? (
        <main className={classNames("translation-layout", panelDrag && "resizing")} style={{ "--workbench-w": `${panelWidths.workbench}px`, "--chat-w": `${panelWidths.chat}px` }}>
          <PageStrip pages={state.pages} current={state.page?.id} onSelect={loadPage} onImportPath={importPath} onFiles={importFiles} />
          <Viewer
            page={state.page}
            crops={state.crops}
            selectedCropId={selectedCropId}
            setSelectedCropId={setSelectedCropId}
            tool={tool}
            setTool={setTool}
            onCreateCrop={createCrop}
            onUpdateCrop={updateCrop}
            onFiles={importFiles}
            onQueueAll={async () => {
              const data = await api("/api/queue/all", { method: "POST", body: JSON.stringify({ pageId: state.page?.id }) });
              setState((s) => ({ ...s, queue: data.queue, crops: data.crops || s.crops }));
            }}
            onAttachPage={() => state.page && addAttachment({ type: "page", id: state.page.id, name: state.page.file_name })}
          />
          <div className="splitter" role="separator" aria-label="Resize workbench" onPointerDown={(event) => setPanelDrag({ kind: "workbench", startX: event.clientX, ...panelWidths })} />
          <Workbench
            page={state.page}
            crops={state.crops}
            queue={state.queue}
            scratchpad={state.scratchpad}
            selectedEntry={selectedEntry}
            selectedCrop={selectedCrop}
            setSelectedEntryId={setSelectedEntryId}
            setSelectedCropId={setSelectedCropId}
            onToggleCrop={(crop) => setSelectedCropId((id) => id === crop.id ? "" : crop.id)}
            labelFocusCropId={labelFocusCropId}
            onLabelFocusConsumed={() => setLabelFocusCropId("")}
            view={workbenchView}
            setView={setWorkbenchView}
            filter={workbenchFilter}
            setFilter={setWorkbenchFilter}
            onSaveEntry={saveScratchpad}
            onDeleteEntry={deleteScratchpad}
            onQueueCrop={queueCrop}
            onMoveQueue={moveQueuedCrop}
            onUpdateCrop={updateCrop}
            onDeleteCrop={deleteCrop}
            onDuplicateCrop={duplicateCrop}
            onDecisions={() => setModal("decisions")}
            onAskLine={(entry) => {
              setChatText(`Focus on ${entry.label}. Explain alternatives and help refine the final translation.`);
              if (state.page) addAttachment({ type: "page", id: state.page.id, name: state.page.file_name });
            }}
          />
          <div className="splitter" role="separator" aria-label="Resize chat" onPointerDown={(event) => setPanelDrag({ kind: "chat", startX: event.clientX, ...panelWidths })} />
          <ChatPanel
            messages={state.messages}
            models={state.models}
            chatSessions={state.chatSessions}
            activeChatSessionId={state.activeChatSessionId}
            attachments={attachments}
            setAttachments={setAttachments}
            crops={state.crops}
            queue={state.queue}
            page={state.page}
            selectedCrop={selectedCrop}
            decisions={state.decisions}
            text={chatText}
            setText={setChatText}
            busy={busy}
            hasKey={state.hasOpenRouterKey}
            model={selectedModel}
            reasoningEffort={state.settings.reasoningEffort || "medium"}
            sourceLanguage={state.settings.sourceLanguage || "Auto"}
            targetLanguage={state.settings.targetLanguage || "English"}
            onLanguage={(patch) => setSetting(patch)}
            onReasoningEffort={(reasoningEffort) => setSetting({ reasoningEffort })}
            onChooseModel={() => setModal("model")}
            onAttachPage={() => state.page && addAttachment({ type: "page", id: state.page.id, name: state.page.file_name })}
            onAttachSelection={() => selectedCrop && addAttachment({ type: "crop", id: selectedCrop.id, name: selectedCrop.name || selectedCrop.label })}
            hasSelection={Boolean(selectedCrop)}
            onAttachQueue={() => setAttachments(state.queue.map((crop) => ({ type: "crop", id: crop.id, name: crop.name || crop.label })))}
            onFillPrompt={() => setChatText(defaultChatPrompt())}
            onGuide={() => setModal("decisions")}
            onNewSession={createChatSession}
            onTemplateSession={createTemplateSession}
            onSelectSession={selectChatSession}
            onRenameSession={renameChatSession}
            onArchiveSession={archiveChatSession}
            onDeleteSession={deleteChatSession}
            onClearChat={clearChat}
            onImportTranslation={(message) => applyTranslationImport(message, false)}
            onUndoTranslationImport={(message) => applyTranslationImport(message, true)}
            onSubmit={sendChat}
          />
        </main>
      ) : <TypesettingPlaceholder />}

      {modal === "onboarding" && <Onboarding state={state} onClose={() => setModal("")} onRefresh={refresh} showToast={showToast} />}
      {modal === "projects" && <ProjectsModal state={state} onClose={() => setModal("")} onRefresh={refresh} showToast={showToast} confirmAction={confirmAction} />}
      {modal === "model" && <ModelPicker models={state.models} selected={state.selectedModel} query={modelQuery} setQuery={setModelQuery} visionOnly={visionOnly} setVisionOnly={setVisionOnly} onClose={() => setModal("")} onSelect={(modelId) => { setSetting({ defaultModel: modelId }).catch((error) => showToast(error.message)); setModal(""); }} />}
      {modal === "settings" && <SettingsModal state={state} onClose={() => setModal("")} onSave={setSetting} showToast={showToast} />}
      {modal === "account" && <AccountModal state={state} onClose={() => setModal("")} onRefresh={refresh} showToast={showToast} />}
      {modal === "export" && <ExportModal page={state.page} onClose={() => setModal("")} onExport={async (payload) => {
        const data = await api("/api/export", { method: "POST", body: JSON.stringify(payload) });
        showToast(`Exported ${data.file}`);
        setModal("");
      }} />}
      {modal === "decisions" && <DecisionsModal project={state.activeProject} decisions={state.decisions} onClose={() => setModal("")} onSave={async (decisions) => {
        const data = await api("/api/decisions", { method: "POST", body: JSON.stringify({ decisions }) });
        setState((s) => ({ ...s, decisions: data.decisions }));
      }} />}
      {dialog && <AppDialog dialog={dialog} />}
      {toast && <div className="toast">{toast}</div>}
      {busy && <div className="busy">{importStatus || "Working..."}</div>}
    </div>
  );
}

function Chrome({ mode, setMode, project, projectProgress, model, decisions, hasKey, keyInfo, onProject, onGuide, onModel, onSettings, onExport, onAccount }) {
  const usage = keyInfo?.usage ? `$${Number(keyInfo.usage).toFixed(2)} used` : hasKey ? "connected" : "offline";
  const projectStatus = projectProgress?.pages
    ? `Final ${projectProgress.final}/${projectProgress.pages} · Drafted ${projectProgress.drafted + projectProgress.final}/${projectProgress.pages}`
    : "";
  return (
    <header className="chrome">
      <div className="brand"><span className="dot"><Icon name="logo" size={18} /></span><span>MangaTranslator</span></div>
      <div className="divider" />
      <button className="project-name" title={project?.path || "No project"} aria-label="Open projects" onClick={onProject}><span>Project · </span><b>{project?.name || "No project"}</b><Icon name="chevronDown" size={12} /></button>
      {projectStatus && <span className="project-progress">{projectStatus}</span>}
      <button className="guide-button" onClick={onGuide} aria-label="Open Project Guide"><Icon name="book" size={13} /><b>Project Guide</b><span>{decisions?.length || 0} rules</span></button>
      <div className="tabs" role="tablist" aria-label="App mode">
        <button aria-pressed={mode === "translation"} onClick={() => setMode("translation")}><Icon name="reading" size={13} /> Translation</button>
        <button aria-pressed={mode === "typesetting"} onClick={() => setMode("typesetting")}><Icon name="type" size={13} /> Typesetting</button>
      </div>
      <div className="spacer" />
      <button className="btn sm ghost" onClick={onModel} aria-label="Choose model"><Icon name="sparkle" size={12} className="accent" /> {modelLabel(model)} <Icon name="chevronDown" size={11} /></button>
      <div className="divider" />
      <button className="btn sm ghost" onClick={onExport} aria-label="Open export"><Icon name="download" size={13} /> Export</button>
      <button className="btn icon sm ghost" onClick={onSettings} title="Settings" aria-label="Settings"><Icon name="settings" size={13} /></button>
      <button className={classNames("btn sm", hasKey ? "ghost" : "primary")} onClick={onAccount} aria-label="Open OpenRouter account"><span className="account-dot">OR</span>{usage}</button>
    </header>
  );
}

function PageStrip({ pages, current, onSelect, onImportPath, onFiles }) {
  const fileRef = useRef(null);
  const folderRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  if (collapsed) {
    return (
      <aside className="page-strip collapsed">
        <button className="btn icon sm ghost" onClick={() => setCollapsed(false)} title="Expand pages" aria-label="Expand pages"><Icon name="chevronRight" /></button>
        <div className="vertical-label">{pages.length} pages</div>
      </aside>
    );
  }
  return (
    <aside className="page-strip">
      <div className="strip-head">
        <span className="section-label">Pages</span>
        <button className="btn icon sm ghost" onClick={() => fileRef.current?.click()} title="Add pages" aria-label="Add pages"><Icon name="plus" /></button>
        <button className="btn icon sm ghost" onClick={onImportPath} title="Import path" aria-label="Import path"><Icon name="folder" /></button>
        <button className="btn icon sm ghost" onClick={() => setCollapsed(true)} title="Collapse pages" aria-label="Collapse pages"><Icon name="chevronLeft" /></button>
        <input ref={fileRef} hidden type="file" multiple accept="image/*,.zip,.cbz,.cbr,.pdf" onChange={(e) => onFiles([...e.target.files])} />
        <input ref={folderRef} hidden type="file" multiple webkitdirectory="" onChange={(e) => onFiles([...e.target.files])} />
      </div>
      <div className="page-list mt-scroll">
        {pages.map((page, index) => (
          <button key={page.id} className={classNames("page-thumb", current === page.id && "active")} onClick={() => onSelect(page.id)} title={page.file_name} aria-label={`Open page ${index + 1}: ${pathTail(page.file_name)}`}>
            <img src={fileUrl(page.workspace_path, page.id)} alt="" />
            <span>{String(index + 1).padStart(2, "0")}</span>
            <small>{pathTail(page.file_name)}</small>
            <PageProgress page={page} compact />
          </button>
        ))}
        <button className="add-thumb" onClick={() => fileRef.current?.click()}><Icon name="plus" /> Add files</button>
        <button className="add-thumb" onClick={() => folderRef.current?.click()}><Icon name="folder" /> Add folder</button>
      </div>
    </aside>
  );
}

function PageProgress({ page, compact = false }) {
  const counts = progressCounts(page);
  const draftPct = counts.total ? Math.min(100, (counts.drafted / counts.total) * 100) : 0;
  const finalPct = counts.total ? Math.min(100, (counts.final / counts.total) * 100) : 0;
  return (
    <div className={classNames("page-progress", compact && "compact", counts.status)}>
      {!compact && <span>{progressLabel(page)}</span>}
      {compact && <span>{counts.total ? `${counts.final}/${counts.total}` : "0"}</span>}
      <div><i style={{ width: `${draftPct}%` }} /><b style={{ width: `${finalPct}%` }} /></div>
    </div>
  );
}

function Viewer({ page, crops, selectedCropId, setSelectedCropId, tool, setTool, onCreateCrop, onUpdateCrop, onFiles, onQueueAll, onAttachPage }) {
  const viewportRef = useRef(null);
  const imageRef = useRef(null);
  const [drawing, setDrawing] = useState(null);
  const [panning, setPanning] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [zoom, setZoom] = useState(72);
  const [zoomText, setZoomText] = useState("72");
  const activeDrawing = drawing?.current ? normalizeRect(drawing.start, drawing.current) : null;

  const clampZoom = (value) => Math.max(8, Math.min(500, Math.round(Number(value) || 72)));
  const fitZoom = () => {
    if (!page || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const next = Math.min((rect.width - 56) / (page.width || 1), (rect.height - 56) / (page.height || 1)) * 100;
    setZoom(clampZoom(next));
  };
  const applyZoom = (nextZoom, event) => {
    const next = clampZoom(nextZoom);
    const viewport = viewportRef.current;
    const image = imageRef.current;
    if (!event || !viewport || !image) return setZoom(next);
    const before = image.getBoundingClientRect();
    const anchorX = (event.clientX - before.left) / before.width;
    const anchorY = (event.clientY - before.top) / before.height;
    setZoom(next);
    window.requestAnimationFrame(() => {
      const after = image.getBoundingClientRect();
      viewport.scrollLeft += after.left + anchorX * after.width - event.clientX;
      viewport.scrollTop += after.top + anchorY * after.height - event.clientY;
    });
  };
  const commitZoomText = () => {
    setZoom(clampZoom(zoomText.replace("%", "")));
  };
  useEffect(() => setZoomText(String(Math.round(zoom))), [zoom]);
  useEffect(() => {
    if (page?.id) window.requestAnimationFrame(fitZoom);
  }, [page?.id]);
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setDrawing(null);
      setPanning(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const point = (event) => {
    const rect = imageRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(page.width, ((event.clientX - rect.left) / rect.width) * page.width)),
      y: Math.max(0, Math.min(page.height, ((event.clientY - rect.top) / rect.height) * page.height)),
    };
  };

  return (
    <section className="viewer-panel">
      <div className="viewer-toolbar">
        <div className="tool-group">
          <button className="btn icon sm ghost" aria-pressed={tool === "cursor"} onClick={() => setTool("cursor")} title="Select (V)" aria-label="Select tool"><Icon name="cursor" /></button>
          <button className="btn icon sm ghost" aria-pressed={tool === "crop"} onClick={() => setTool("crop")} title="Crop (C)" aria-label="Crop tool"><Icon name="rectangle" /></button>
          <button className="btn icon sm ghost" aria-pressed={tool === "hand"} onClick={() => setTool("hand")} title="Pan (H)" aria-label="Pan tool"><Icon name="hand" /></button>
        </div>
        <button className="btn sm ghost" disabled={!page} onClick={onAttachPage}><Icon name="image" /> Send page</button>
        <button className="btn sm ghost" disabled={!crops.length} onClick={onQueueAll}><Icon name="queue" /> Queue crops ({crops.length})</button>
        <span className="spacer" />
        <span className="muted mono">{page ? `${page.width || "?"} x ${page.height || "?"} · ${pathTail(page.file_name)}` : "Images, folders, ZIP, CBZ; PDF soon"}</span>
        <button className="btn icon sm ghost" onClick={() => applyZoom(zoom - 10)} title="Zoom out" aria-label="Zoom out"><Icon name="zoomOut" /></button>
        <form className="zoom-form" onSubmit={(e) => { e.preventDefault(); commitZoomText(); }}>
          <input value={zoomText} onChange={(e) => setZoomText(e.target.value)} onBlur={commitZoomText} aria-label="Zoom percentage" />
          <span>%</span>
        </form>
        <button className="btn icon sm ghost" onClick={() => applyZoom(zoom + 10)} title="Zoom in" aria-label="Zoom in"><Icon name="zoomIn" /></button>
        <button className="btn icon sm ghost" onClick={fitZoom} title="Fit to view" aria-label="Fit to view"><Icon name="fit" /></button>
      </div>
      <div
        ref={viewportRef}
        className={classNames("viewer-stage mt-scroll", dragActive && "drag-active")}
        onDragEnter={(event) => {
          event.preventDefault();
          if (Array.from(event.dataTransfer?.types || []).includes("Files")) setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          const files = [...(event.dataTransfer?.files || [])];
          if (files.length) onFiles(files);
        }}
        onWheel={(event) => {
          if (!page || !(event.ctrlKey || event.metaKey || event.altKey)) return;
          event.preventDefault();
          applyZoom(zoom * (event.deltaY > 0 ? 0.9 : 1.1), event);
        }}
      >
        {dragActive && <div className="drop-overlay"><Icon name="archive" size={28} /><b>Drop pages to import</b><span>Images, folders, ZIP, CBZ; PDF is queued</span></div>}
        {!page ? (
          <div className="empty-state">
            <Icon name="image" size={32} />
            <h2>Import your first page</h2>
            <p>Drop images, folders, ZIP, or CBZ files into the project. PDF support is queued into this importer.</p>
          </div>
        ) : (
          <div
            className={classNames("image-stage page-halo", `tool-${tool}`)}
            style={{ width: `${Math.max(80, (page.width || 700) * (zoom / 100))}px`, aspectRatio: `${page.width || 1} / ${page.height || 1}` }}
            onPointerDown={(event) => {
              if (event.target.closest(".crop-box")) return;
              if (tool === "hand") {
                setPanning({ x: event.clientX, y: event.clientY, left: viewportRef.current.scrollLeft, top: viewportRef.current.scrollTop });
                event.currentTarget.setPointerCapture(event.pointerId);
                return;
              }
              if (tool !== "crop") return;
              const start = point(event);
              setDrawing({ start, current: start });
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (panning && viewportRef.current) {
                viewportRef.current.scrollLeft = panning.left - (event.clientX - panning.x);
                viewportRef.current.scrollTop = panning.top - (event.clientY - panning.y);
              } else if (drawing) {
                setDrawing((d) => ({ ...d, current: point(event) }));
              }
            }}
            onPointerUp={() => {
              if (activeDrawing && activeDrawing.width > 8 && activeDrawing.height > 8) onCreateCrop(activeDrawing);
              setDrawing(null);
              setPanning(null);
            }}
            onPointerCancel={() => { setDrawing(null); setPanning(null); }}
          >
            <img ref={imageRef} src={fileUrl(page.workspace_path, page.id)} alt={page.file_name} draggable="false" />
            {crops.map((crop) => <CropBox key={crop.id} crop={crop} page={page} tool={tool} selected={selectedCropId === crop.id} onSelect={() => setSelectedCropId(crop.id)} onUpdate={onUpdateCrop} />)}
            {activeDrawing && <CropBox crop={{ ...activeDrawing, label: "New", type: "speech" }} page={page} pending />}
          </div>
        )}
      </div>
      <div className="viewer-footer"><Icon name="check" className="success" /> Saved locally · {crops.length} crops · {crops.filter((c) => c.type === "speech").length} speech <span className="spacer" /><span className="kbd">V</span> Select <span className="kbd">C</span> Crop <span className="kbd">Shift Enter</span> Send</div>
    </section>
  );
}

function CropBox({ crop, page, tool, selected, pending, onSelect, onUpdate }) {
  const [draftRect, setDraftRect] = useState(null);
  const dragRef = useRef(null);
  const rect = draftRect || crop;
  const style = {
    left: `${(rect.x / page.width) * 100}%`,
    top: `${(rect.y / page.height) * 100}%`,
    width: `${(rect.width / page.width) * 100}%`,
    height: `${(rect.height / page.height) * 100}%`,
  };
  const clampRect = (next) => {
    const min = 12;
    const width = Math.max(min, Math.min(page.width, next.width));
    const height = Math.max(min, Math.min(page.height, next.height));
    const x = Math.max(0, Math.min(page.width - width, next.x));
    const y = Math.max(0, Math.min(page.height - height, next.y));
    return { x, y, width, height };
  };
  const dragRect = (event) => {
    const drag = dragRef.current;
    const image = event.currentTarget.closest(".image-stage")?.getBoundingClientRect();
    if (!drag || !image) return crop;
    const dx = ((event.clientX - drag.clientX) / image.width) * page.width;
    const dy = ((event.clientY - drag.clientY) / image.height) * page.height;
    if (drag.handle === "move") return clampRect({ ...drag.start, x: drag.start.x + dx, y: drag.start.y + dy });
    const next = { ...drag.start };
    if (drag.handle.includes("w")) {
      next.x = drag.start.x + dx;
      next.width = drag.start.width - dx;
    }
    if (drag.handle.includes("e")) next.width = drag.start.width + dx;
    if (drag.handle.includes("n")) {
      next.y = drag.start.y + dy;
      next.height = drag.start.height - dy;
    }
    if (drag.handle.includes("s")) next.height = drag.start.height + dy;
    return clampRect(next);
  };
  return (
    <button
      className={classNames("crop-box", crop.type || "speech", selected && "selected", pending && "pending")}
      style={style}
      aria-label={`Select crop ${crop.label || crop.name || "Crop"}`}
      onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
      onPointerDown={(event) => {
        if (pending || !["cursor", "crop"].includes(tool) || !onUpdate) return;
        event.stopPropagation();
        onSelect?.();
        dragRef.current = { clientX: event.clientX, clientY: event.clientY, start: crop, handle: event.target.dataset.handle || "move" };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!dragRef.current) return;
        setDraftRect(dragRect(event));
      }}
      onPointerUp={(event) => {
        if (!dragRef.current) return;
        const next = dragRect(event);
        dragRef.current = null;
        setDraftRect(null);
        onUpdate(crop, next).catch?.(() => {});
      }}
      onPointerCancel={() => { dragRef.current = null; setDraftRect(null); }}
    >
      <span>{crop.label || crop.name || "Crop"}</span>
      {selected && <><i data-handle="nw" /><i data-handle="ne" /><i data-handle="sw" /><i data-handle="se" /></>}
    </button>
  );
}

function Workbench({ page, crops, queue, scratchpad, selectedEntry, selectedCrop, setSelectedEntryId, setSelectedCropId, onToggleCrop, labelFocusCropId, onLabelFocusConsumed, view, setView, filter, setFilter, onSaveEntry, onDeleteEntry, onQueueCrop, onMoveQueue, onUpdateCrop, onDeleteCrop, onDuplicateCrop, onDecisions, onAskLine }) {
  const queueIndex = useMemo(() => new Map(queue.map((crop, index) => [crop.id, index])), [queue]);
  const visibleRows = scratchpad.filter((entry) => {
    if (filter === "queue") return queue.some((crop) => crop.label === entry.label);
    if (filter === "draft") return entry.draft && !entry.confirmed;
    if (filter === "final") return entry.confirmed;
    return true;
  });
  const draftCount = scratchpad.filter((row) => row.draft && !row.confirmed).length;
  const finalCount = scratchpad.filter((row) => row.confirmed).length;
  return (
    <aside className="workbench">
      <div className="panel-header">
        <div className="hstack"><Icon name="layers" /><b>Workbench</b><span className="pill">{page ? pathTail(page.file_name).replace(/\.[^.]+$/, "") : "No page"}</span>{page && <PageProgress page={page} />}</div>
        <div className="hstack mini">
          <button className="btn icon sm ghost" aria-pressed={view === "text"} onClick={() => setView("text")} title="Text list view" aria-label="Text list view"><Icon name="queue" /></button>
          <button className="btn icon sm ghost" aria-pressed={view === "card"} onClick={() => setView("card")} title="Card view" aria-label="Card view"><Icon name="grid" /></button>
        </div>
      </div>
      <div className="filter-row">
        {[["all", "All", scratchpad.length], ["queue", "Queue", queue.length], ["draft", "Drafts", draftCount], ["final", "Final", finalCount]].map(([id, label, count]) => (
          <button key={id} className="btn sm ghost" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label} <span>{count}</span></button>
        ))}
        <button className="btn primary sm" onClick={() => page && onSaveEntry({ label: nextScratchLabel(scratchpad), type: "speech", source: "", draft: "", final: "", notes: "" })}><Icon name="plus" /> Line</button>
      </div>
      {view === "card" ? (
        <div className="card-list mt-scroll">
          {crops.map((crop) => {
            const index = queueIndex.get(crop.id);
            const queued = index !== undefined;
            return (
              <article key={crop.id} className={classNames("crop-card", selectedCrop?.id === crop.id && "active")}>
                <button className="crop-card-main" onClick={() => onToggleCrop(crop)}>
                  <span className={classNames("pill dot", crop.type)}>{crop.label}</span>
                  <b>{crop.name || "crop"}</b>
                  <small>{queued ? `Q${index + 1}` : `${Math.round(crop.width)} x ${Math.round(crop.height)}`}</small>
                </button>
                {queued && <QueueStepper index={index} total={queue.length} onUp={() => onMoveQueue(crop, -1)} onDown={() => onMoveQueue(crop, 1)} />}
                <button className="btn sm ghost" onClick={() => onQueueCrop(crop, queued)}>{queued ? "Unqueue" : "Queue"}</button>
                <button className="btn icon sm ghost" onClick={() => onDeleteCrop(crop)} title="Delete crop" aria-label={`Delete crop ${crop.label}`}><Icon name="trash" /></button>
              </article>
            );
          })}
          {visibleRows.map((row) => <button key={row.id} className="scratch-card" onClick={() => setSelectedEntryId(row.id)}><ScratchSummary row={row} /><p>{row.notes || "No notes yet."}</p></button>)}
          {!crops.length && !visibleRows.length && <div className="quiet">Crops and scratchpad cards will appear here.</div>}
        </div>
      ) : (
        <div className="workbench-body">
          <div className="line-list mt-scroll">
            {visibleRows.map((row) => <button key={row.id} className={classNames("line-row", selectedEntry?.id === row.id && "active")} onClick={() => setSelectedEntryId(row.id)}><ScratchSummary row={row} /></button>)}
            {!visibleRows.length && <div className="quiet">Model first-pass lines will appear here automatically.</div>}
          </div>
          <EntryEditor entry={selectedEntry} onSave={onSaveEntry} onDelete={onDeleteEntry} onAsk={onAskLine} />
        </div>
      )}
      <div className="crop-dock mt-scroll">
        <div className="section-label">Crops</div>
        {crops.map((crop) => {
          const index = queueIndex.get(crop.id);
          const queued = index !== undefined;
          return (
            <div key={crop.id} className={classNames("crop-chip-row", selectedCrop?.id === crop.id && "active")}>
              <button className="crop-chip" onClick={() => onToggleCrop(crop)} aria-label={`${selectedCrop?.id === crop.id ? "Unselect" : "Select"} crop ${crop.label}`}><span className={classNames("pill dot", crop.type)}>{crop.label}</span><span>{crop.name || "crop"}</span>{queued && <small>Q{index + 1}</small>}</button>
              {queued && <QueueStepper index={index} total={queue.length} onUp={() => onMoveQueue(crop, -1)} onDown={() => onMoveQueue(crop, 1)} compact />}
              <button className="btn sm ghost" onClick={() => onQueueCrop(crop, queued)} aria-label={`${queued ? "Remove" : "Queue"} crop ${crop.label}`}>{queued ? "queued" : "+"}</button>
              <button className="btn icon sm ghost" onClick={() => onDeleteCrop(crop)} title="Delete crop" aria-label={`Delete crop ${crop.label}`}><Icon name="trash" /></button>
            </div>
          );
        })}
      </div>
      <CropInspector
        crop={selectedCrop}
        queuedIndex={selectedCrop ? queueIndex.get(selectedCrop.id) : undefined}
        queueTotal={queue.length}
        focusCropId={labelFocusCropId}
        onFocusConsumed={onLabelFocusConsumed}
        onSave={onUpdateCrop}
        onSaved={() => setSelectedCropId("")}
        onQueue={onQueueCrop}
        onMoveQueue={onMoveQueue}
        onDuplicate={onDuplicateCrop}
        onDelete={onDeleteCrop}
      />
    </aside>
  );
}

function QueueStepper({ index, total, onUp, onDown, compact = false }) {
  return (
    <span className={classNames("queue-stepper", compact && "compact")}>
      <button type="button" className="btn icon sm ghost" disabled={index <= 0} onClick={onUp} title="Move earlier" aria-label="Move queued crop earlier"><Icon name="chevronLeft" /></button>
      {!compact && <small>{index + 1}/{total}</small>}
      <button type="button" className="btn icon sm ghost" disabled={index >= total - 1} onClick={onDown} title="Move later" aria-label="Move queued crop later"><Icon name="chevronRight" /></button>
    </span>
  );
}

function CropInspector({ crop, queuedIndex, queueTotal, focusCropId, onFocusConsumed, onSave, onSaved, onQueue, onMoveQueue, onDuplicate, onDelete }) {
  const [draft, setDraft] = useState(crop || {});
  const labelRef = useRef(null);
  useEffect(() => setDraft(crop || {}), [crop?.id, crop?.x, crop?.y, crop?.width, crop?.height, crop?.label, crop?.type]);
  useEffect(() => {
    if (crop?.id && crop.id === focusCropId && labelRef.current) {
      labelRef.current.focus();
      labelRef.current.select();
      onFocusConsumed?.();
    }
  }, [crop?.id, focusCropId]);
  if (!crop) return <div className="crop-inspector quiet">Select a crop to rename, move, resize, or delete it.</div>;
  const update = (patch) => setDraft((value) => ({ ...value, ...patch }));
  return (
    <form className="crop-inspector" onSubmit={async (event) => { event.preventDefault(); await onSave(crop, draft); onSaved?.(); }}>
      <div className="inspector-head">
        <b>Crop inspector</b>
        <button type="button" className="btn icon sm ghost" onClick={() => onDelete(crop)} title="Delete crop" aria-label={`Delete crop ${crop.label}`}><Icon name="trash" /></button>
      </div>
      <div className="form-grid mini">
        <label>Label<input ref={labelRef} value={draft.label || ""} onChange={(e) => update({ label: e.target.value, name: e.target.value, type: labelType(e.target.value) })} /></label>
        <label>Type<select value={draft.type || "speech"} onChange={(e) => update({ type: e.target.value })}><option value="speech">speech</option><option value="sfx">sfx</option><option value="narration">narration</option></select></label>
        <label>X<input type="number" value={Math.round(Number(draft.x) || 0)} onChange={(e) => update({ x: Number(e.target.value) })} /></label>
        <label>Y<input type="number" value={Math.round(Number(draft.y) || 0)} onChange={(e) => update({ y: Number(e.target.value) })} /></label>
        <label>W<input type="number" value={Math.round(Number(draft.width) || 1)} onChange={(e) => update({ width: Number(e.target.value) })} /></label>
        <label>H<input type="number" value={Math.round(Number(draft.height) || 1)} onChange={(e) => update({ height: Number(e.target.value) })} /></label>
      </div>
      <div className="inspector-actions">
        <button type="button" className="btn sm ghost" onClick={() => onQueue(crop, queuedIndex !== undefined)}><Icon name="queue" /> {queuedIndex !== undefined ? `Queued ${queuedIndex + 1}/${queueTotal}` : "Add to queue"}</button>
        {queuedIndex !== undefined && <QueueStepper index={queuedIndex} total={queueTotal} onUp={() => onMoveQueue(crop, -1)} onDown={() => onMoveQueue(crop, 1)} />}
        <button type="button" className="btn sm ghost" onClick={() => onDuplicate(crop)}><Icon name="copy" /> Duplicate</button>
      </div>
      <button className="btn primary sm"><Icon name="check" /> Save crop</button>
    </form>
  );
}

function ScratchSummary({ row }) {
  const type = normalizeLineType(row.type, row.label);
  return (
    <>
      <span className={classNames("pill dot", type)}>{row.label}</span>
      <span className="truncate">{row.final || row.draft || "No translation yet"}</span>
      <small>{row.source || ""}</small>
      {Boolean(row.confirmed) && <Icon name="check" className="success" />}
    </>
  );
}

function EntryEditor({ entry, onSave, onDelete, onAsk }) {
  const [draft, setDraft] = useState(entry || {});
  const pendingSaves = useRef(new Map());
  const waitForPendingSave = async (entryId) => {
    const pending = pendingSaves.current.get(entryId);
    if (pending) await pending.catch(() => {});
  };
  const saveDraft = async (patch = {}) => {
    if (!entry) return;
    const entryId = entry.id;
    const next = { ...draft, ...patch, id: entryId };
    setDraft(next);
    const previous = pendingSaves.current.get(entryId) || Promise.resolve();
    const savePromise = previous.catch(() => {}).then(() => onSave(next));
    pendingSaves.current.set(entryId, savePromise);
    try {
      await savePromise;
    } finally {
      if (pendingSaves.current.get(entryId) === savePromise) pendingSaves.current.delete(entryId);
    }
  };
  useEffect(() => setDraft(entry || {}), [entry?.id]);
  if (!entry) return <div className="entry-editor quiet">Select or create a scratchpad line.</div>;
  const update = (patch) => setDraft((value) => ({ ...value, ...patch }));
  const dirty = ["label", "type", "source", "draft", "final", "notes", "confirmed"].some((key) => String(draft[key] ?? "") !== String(entry[key] ?? ""));
  const confirmed = Boolean(draft.confirmed);
  return (
    <form className="entry-editor mt-scroll" onSubmit={async (e) => { e.preventDefault(); await saveDraft({ confirmed: confirmed ? 0 : 1 }); }}>
      <div className="editor-head">
        <input value={draft.label || ""} onChange={(e) => update({ label: e.target.value, type: labelType(e.target.value) })} onBlur={() => dirty && saveDraft()} />
        <select value={draft.type || "speech"} onChange={(e) => saveDraft({ type: e.target.value })}><option value="speech">speech</option><option value="sfx">sfx</option><option value="narration">narration</option></select>
        <button type="button" className="btn icon sm ghost" onClick={() => onAsk(entry)} title="Ask about this line" aria-label="Ask about this line"><Icon name="chat" /></button>
        <button type="button" className="btn icon sm ghost" onClick={async () => { await waitForPendingSave(entry.id); await onDelete(entry); }} title="Delete line" aria-label="Delete line"><Icon name="trash" /></button>
      </div>
      <label>Source <textarea value={draft.source || ""} onChange={(e) => update({ source: e.target.value })} onBlur={() => dirty && saveDraft()} /></label>
      <label>Draft <textarea value={draft.draft || ""} onChange={(e) => update({ draft: e.target.value })} onBlur={() => dirty && saveDraft()} /></label>
      <label>Final <textarea className="final" value={draft.final || ""} onChange={(e) => update({ final: e.target.value, confirmed: 0 })} onBlur={() => dirty && saveDraft()} /></label>
      <label>Notes <textarea value={draft.notes || ""} onChange={(e) => update({ notes: e.target.value })} onBlur={() => dirty && saveDraft()} /></label>
      <div className="hstack">
        <button type="button" className="btn sm ghost" onClick={() => saveDraft({ final: draft.draft || "", confirmed: 0 })}><Icon name="copy" /> Copy draft to final</button>
        <span className="spacer" />
        {dirty && <button type="button" className="btn sm ghost" onClick={() => saveDraft()}>Save edits</button>}
        <button className={classNames("btn sm", confirmed ? "ghost" : "primary")}><Icon name={confirmed ? "close" : "check"} /> {confirmed ? "Unconfirm" : "Confirm"}</button>
      </div>
    </form>
  );
}

function ChatPanel({ messages, models, chatSessions, activeChatSessionId, attachments, setAttachments, crops, queue, page, selectedCrop, decisions, text, setText, busy, hasKey, model, reasoningEffort, sourceLanguage, targetLanguage, onLanguage, onReasoningEffort, onChooseModel, onAttachPage, onAttachSelection, hasSelection, onAttachQueue, onFillPrompt, onGuide, onNewSession, onTemplateSession, onSelectSession, onRenameSession, onArchiveSession, onDeleteSession, onClearChat, onImportTranslation, onUndoTranslationImport, onSubmit }) {
  const pageAttached = Boolean(page && attachments.some((item) => item.type === "page" && item.id === page.id));
  const attachedCropIds = new Set(attachments.filter((item) => item.type === "crop").map((item) => item.id));
  const selectionAttached = Boolean(selectedCrop && attachedCropIds.has(selectedCrop.id));
  const queueAttached = Boolean(queue.length && queue.every((crop) => attachedCropIds.has(crop.id)));
  const activeSession = chatSessions.find((session) => session.id === activeChatSessionId) || chatSessions[0];
  const messageEndRef = useRef(null);
  const [editingSessionId, setEditingSessionId] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const startRename = (session) => {
    setEditingSessionId(session?.id || "");
    setSessionTitle(session?.title || "Translation pass");
  };
  const commitRename = async (event) => {
    event?.preventDefault();
    const session = chatSessions.find((item) => item.id === editingSessionId);
    if (!session) return setEditingSessionId("");
    await onRenameSession(session, sessionTitle);
    setEditingSessionId("");
  };
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, messages.at(-1)?.content]);
  return (
    <aside className="chat-panel">
      <div className="panel-header">
        <div className="hstack"><Icon name="chat" /><b>Translation chat</b><span className="pill">auto-saved</span></div>
      </div>
      <div className="chat-pass-row">
        <span>Chats</span>
        {editingSessionId === activeChatSessionId ? (
          <form className="chat-session-editor" onSubmit={commitRename}>
            <input value={sessionTitle} onChange={(e) => setSessionTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setEditingSessionId(""); }} autoFocus />
            <button className="btn icon sm ghost" title="Save pass name" aria-label="Save pass name"><Icon name="check" /></button>
          </form>
        ) : (
          <select value={activeChatSessionId || ""} onChange={(e) => onSelectSession(e.target.value)} disabled={!chatSessions.length}>
            {chatSessions.map((session) => <option key={session.id} value={session.id}>{session.title || "Translation pass"}</option>)}
          </select>
        )}
        <button className="btn icon sm ghost" onClick={() => startRename(activeSession)} disabled={!activeSession} title="Rename active pass" aria-label="Rename active pass"><Icon name="pencil" /></button>
        <button className="btn icon sm ghost" onClick={onNewSession} disabled={!page} title="New pass" aria-label="New chat pass"><Icon name="plus" /></button>
        <button className="btn icon sm ghost" onClick={() => onArchiveSession(activeSession)} disabled={!activeSession} title="Archive pass" aria-label="Archive active pass"><Icon name="archive" /></button>
        <button className="btn icon sm ghost" onClick={() => onDeleteSession(activeSession)} disabled={!activeSession} title="Delete pass" aria-label="Delete active pass"><Icon name="trash" /></button>
        <button className="btn sm ghost subtle" onClick={() => onClearChat("session")} disabled={!messages.length}>Clear</button>
      </div>
      <div className="template-row">
        {PASS_TEMPLATES.map((template) => (
          <button key={template.id} className="btn sm ghost" disabled={!page || (template.id === "crop-queue" && !queue.length) || (template.id === "line-refine" && !hasSelection)} onClick={() => onTemplateSession(template)}>{template.label}</button>
        ))}
      </div>
      <div className="language-row">
        <Icon name="globe" />
        <select value={sourceLanguage} onChange={(e) => onLanguage({ sourceLanguage: e.target.value })}>{LANGUAGES.map((lang) => <option key={lang}>{lang}</option>)}</select>
        <Icon name="chevronRight" />
        <select value={targetLanguage} onChange={(e) => onLanguage({ targetLanguage: e.target.value })}>{LANGUAGES.filter((l) => l !== "Auto").map((lang) => <option key={lang}>{lang}</option>)}</select>
        <button className="btn sm ghost model-select" onClick={onChooseModel}><Icon name="sparkle" /> {modelLabel(model)}</button>
        <label className="reasoning-select" title="OpenRouter reasoning effort">
          <span>Think</span>
          <select value={reasoningEffort} onChange={(e) => onReasoningEffort(e.target.value)}>
            {REASONING_EFFORTS.map((effort) => <option key={effort} value={effort}>{effort}</option>)}
          </select>
        </label>
      </div>
      <div className="context-row">
        <span>Attached</span>
        {attachments.length ? attachments.map((item, index) => (
          <button key={`${item.type}:${item.id}`} className="pill active attachment-chip" onClick={() => setAttachments(attachments.filter((_, i) => i !== index))} aria-label={`Remove attachment ${item.name || item.type}`}>
            {item.name || item.type}<Icon name="close" size={10} />
          </button>
        )) : <small>No page or crop attached</small>}
        <button className="pill guide-chip" onClick={onGuide} title={guideSummary(decisions)}><Icon name="book" size={11} /> {guideShortSummary(decisions)}</button>
      </div>
      <div className="message-list mt-scroll">
        {messages.map((message, index) => <Message key={message.id || index} message={message} models={models} onImportTranslation={onImportTranslation} onUndoTranslationImport={onUndoTranslationImport} />)}
        {!messages.length && (
          <div className="chat-empty">
            <p>Start a focused pass for this page.</p>
            <button className="btn sm ghost" disabled={!page} onClick={onAttachPage}><Icon name="image" /> Attach page</button>
            <button className="btn sm ghost" disabled={!queue.length} onClick={onAttachQueue}><Icon name="queue" /> Attach queue</button>
            <button className="btn sm ghost" onClick={onFillPrompt}><Icon name="sparkle" /> Draft prompt</button>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>
      <form className="composer" onSubmit={onSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.shiftKey) {
              e.preventDefault();
              onSubmit(e);
            }
          }}
          placeholder="Ask a follow-up, or attach the current page / selected crops..."
        />
        <div className="composer-actions">
          <button type="button" className="btn sm ghost" aria-pressed={pageAttached} disabled={!page} onClick={onAttachPage}><Icon name="image" /> Page</button>
          <button type="button" className="btn sm ghost" aria-pressed={selectionAttached} disabled={!hasSelection} onClick={onAttachSelection}><Icon name="rectangle" /> Selection</button>
          <button type="button" className="btn sm ghost" aria-pressed={queueAttached} disabled={!queue.length} onClick={onAttachQueue}><Icon name="queue" /> Queue ({queue.length})</button>
          <button type="button" className="btn sm ghost" onClick={onFillPrompt}>Draft prompt</button>
          <span className="spacer" />
          <button className="btn primary sm" disabled={busy || (!text.trim() && !attachments.length)} title={hasKey ? "Send to selected model" : "Connect OpenRouter or add a key to send"}><Icon name="send" /> Send</button>
        </div>
      </form>
    </aside>
  );
}

function Message({ message, models, onImportTranslation, onUndoTranslationImport }) {
  const attachments = safeJson(message.attachments_json, []);
  const structuredEntries = safeJson(message.translation_entries_json, []);
  const isUser = message.role === "user";
  const isError = String(message.role).includes("error");
  const isAssistant = String(message.role).startsWith("assistant");
  const roleLabel = isUser ? "user" : "assistant";
  const modelName = isAssistant && message.model ? modelLabelForId(message.model, models) : "";
  const bodyText = String(message.content || "").trim();
  const hasBody = Boolean(bodyText && !(isUser && bodyText === "..." && attachments.length));
  const importedCount = structuredEntries.filter((entry) => entry.scratchpad_entry_id).length;
  return (
    <article className={classNames("message", isUser ? "user" : "assistant", isError && "error")}>
      <div className="message-meta"><span>{roleLabel}</span>{modelName && <b title={message.model}>{modelName}</b>}{message.created_at && <time>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>}{attachments.length > 0 && <b>{attachments.length} attachment{attachments.length === 1 ? "" : "s"}</b>}</div>
      {attachments.length > 0 && <div className="message-attachments">{attachments.map((a) => <span key={`${a.type}:${a.id}`}>{a.type}: {a.name || a.id}</span>)}</div>}
      {isAssistant && structuredEntries.length > 0 && (
        <div className="translation-actions">
          <span>{structuredEntries.length} structured line{structuredEntries.length === 1 ? "" : "s"}{importedCount ? ` · ${importedCount} in scratchpad` : ""}</span>
          {importedCount ? (
            <button className="btn sm ghost" onClick={() => onUndoTranslationImport?.(message)}><Icon name="close" /> Undo scratchpad</button>
          ) : (
            <button className="btn sm primary" onClick={() => onImportTranslation?.(message)}><Icon name="check" /> Send to scratchpad</button>
          )}
        </div>
      )}
      {hasBody ? <MessageBody content={message.content} isAssistant={isAssistant} /> : (isAssistant && <div className="message-bubble pending">...</div>)}
    </article>
  );
}

function MessageBody({ content, isAssistant }) {
  const { blocks, remainder } = isAssistant ? parseAssistantContent(content) : { blocks: [], remainder: "" };
  if (blocks.length >= 2) {
    return (
      <div className="assistant-blocks">
        {blocks.map((block, index) => (
          <section key={`${block.label}-${index}`} className="assistant-line-card">
            <header><b>{block.label}</b>{block.type && <span>{block.type}</span>}</header>
            {block.source && <p><strong>Source</strong>{block.source}</p>}
            {block.draft && <p><strong>Draft</strong>{block.draft}</p>}
            {block.notes && <p><strong>Notes</strong>{block.notes}</p>}
          </section>
        ))}
        {remainder && <MarkdownBubble content={remainder} />}
      </div>
    );
  }
  return <MarkdownBubble content={content} />;
}

function MarkdownBubble({ content }) {
  return (
    <div className="message-bubble markdown-body">
      <Suspense fallback={<span>{String(content || "")}</span>}>
        <Streamdown>{String(content || "")}</Streamdown>
      </Suspense>
    </div>
  );
}

function parseAssistantContent(content = "") {
  const lines = String(content).split(/\r?\n/);
  const blocks = [];
  let current = null;
  let activeField = "";
  let remainderStart = lines.length;
  const commit = () => {
    if (current && (current.source || current.draft || current.notes || current.type)) blocks.push(current);
  };
  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    const match = line.match(/^(?:[-*]\s*)?(?:\*\*)?Label(?:\*\*)?\s*:\s*(SFX\d+|S\d+|N\d+)/i);
    if (match) {
      commit();
      current = { label: match[1].toUpperCase(), type: "", source: "", draft: "", notes: "" };
      activeField = "";
      continue;
    }
    if (!current) continue;
    const field = line.match(/^(?:[-*]\s*)?(?:\*\*)?(Type|Source|Draft|Notes?)(?:\*\*)?\s*:\s*(.*)$/i);
    if (!field) {
      if (!line) continue;
      if (activeField && /^\s+/.test(rawLine)) {
        current[activeField] = `${current[activeField]} ${stripMarkdown(line)}`.trim();
        continue;
      }
      remainderStart = index;
      break;
    }
    const key = field[1].toLowerCase().replace(/^note$/, "notes");
    current[key] = stripMarkdown(field[2]);
    activeField = key;
  }
  commit();
  return {
    blocks,
    remainder: lines.slice(remainderStart).join("\n").trim(),
  };
}

function parseAssistantBlocks(content = "") {
  return parseAssistantContent(content).blocks;
}

function stripMarkdown(value = "") {
  return String(value)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[-*]\s+/, "")
    .trim();
}

function Onboarding({ state, onClose, onRefresh, showToast }) {
  const [step, setStep] = useState(state.hasOpenRouterKey ? 1 : 0);
  const [workspaceRoot, setWorkspaceRoot] = useState(state.workspaceRoot || state.defaultWorkspaceRoot);
  const [projectName, setProjectName] = useState("Kagayaki Vol. 2");
  const [mode, setMode] = useState("copy");
  const [busy, setBusy] = useState(false);
  const createProject = async () => {
    setBusy(true);
    try {
      await api("/api/workspace/setup", { method: "POST", body: JSON.stringify({ workspaceRoot, projectName, importMode: mode }) });
      await onRefresh();
      onClose();
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal wide title="Welcome to MangaTranslator" onClose={onClose}>
      <div className="progress">{[0, 1, 2].map((i) => <span key={i} className={step >= i ? "active" : ""} />)}</div>
      {step === 0 && <div className="modal-pane"><h3>Connect OpenRouter</h3><p>Sign in for model access, or skip and use MangaTranslator in project-only mode.</p><button className="btn primary" onClick={async () => { const data = await api("/api/auth/openrouter/start"); window.open(data.url, "_blank", "width=960,height=800"); setStep(1); }}><Icon name="sparkle" /> Connect</button><button className="btn ghost" onClick={() => setStep(1)}>Continue without account</button></div>}
      {step === 1 && <div className="modal-pane"><h3>Workspace folder</h3><p>Projects, crops, scratchpads, cache files, and exports live here.</p><label>Workspace root<input value={workspaceRoot} onChange={(e) => setWorkspaceRoot(e.target.value)} /></label><label>Project name<input value={projectName} onChange={(e) => setProjectName(e.target.value)} /></label><div className="hstack"><button className="btn ghost" onClick={onClose}>Skip</button><span className="spacer" /><button className="btn primary" onClick={() => setStep(2)}>Continue</button></div></div>}
      {step === 2 && <div className="modal-pane"><h3>Import mode</h3><p>Images, folders, ZIP, and CBZ are supported now. PDF and CBR are shown in the UI and return clear follow-up messages.</p><label className={classNames("choice", mode === "copy" && "selected")}><input type="radio" checked={mode === "copy"} onChange={() => setMode("copy")} /> Copy into workspace <span>recommended</span></label><label className={classNames("choice", mode === "inplace" && "selected")}><input type="radio" checked={mode === "inplace"} onChange={() => setMode("inplace")} /> Work in place</label><div className="hstack"><button className="btn ghost" onClick={() => setStep(1)}>Back</button><span className="spacer" /><button className="btn primary" disabled={busy} onClick={createProject}>Create project</button></div></div>}
    </Modal>
  );
}

function ProjectsModal({ state, onClose, onRefresh, showToast, confirmAction }) {
  const [workspaceRoot, setWorkspaceRoot] = useState(state.workspaceRoot || state.defaultWorkspaceRoot);
  const [projectName, setProjectName] = useState("New Manga Project");
  const [importMode, setImportMode] = useState("copy");
  const openProject = async (slug) => {
    try {
      await api("/api/projects/open", { method: "POST", body: JSON.stringify({ slug }) });
      await onRefresh();
      onClose();
    } catch (error) {
      showToast(error.message);
    }
  };
  const createProject = async () => {
    try {
      await api("/api/workspace/setup", { method: "POST", body: JSON.stringify({ workspaceRoot, projectName, importMode }) });
      await onRefresh();
      onClose();
    } catch (error) {
      showToast(error.message);
    }
  };
  const deleteProject = async (project) => {
    if (!project || !(await confirmAction({ title: "Delete Project", message: `Delete project ${project.name}? This removes its local workspace folder.`, confirmLabel: "Delete", danger: true }))) return;
    try {
      await api("/api/projects/delete", { method: "POST", body: JSON.stringify({ slug: project.slug }) });
      await onRefresh();
      showToast("Project deleted.");
    } catch (error) {
      showToast(error.message);
    }
  };
  return (
    <Modal wide title="Projects" onClose={onClose}>
      <div className="projects-modal">
        <section>
          <h3>Open project</h3>
          <div className="project-list">
            {state.projects.map((project) => (
              <div key={project.slug} className={classNames("project-row", state.activeProject?.slug === project.slug && "active")}>
                <button onClick={() => openProject(project.slug)}>
                  <b>{project.name}</b>
                  <span>{project.path}</span>
                </button>
                <button className="btn icon sm ghost" onClick={() => deleteProject(project)} title="Delete project" aria-label={`Delete project ${project.name}`}><Icon name="trash" /></button>
              </div>
            ))}
            {!state.projects.length && <p className="muted">No projects yet.</p>}
          </div>
        </section>
        <section>
          <h3>Create project</h3>
          <label>Workspace root<input value={workspaceRoot} onChange={(e) => setWorkspaceRoot(e.target.value)} /></label>
          <label>Project name<input value={projectName} onChange={(e) => setProjectName(e.target.value)} /></label>
          <label className={classNames("choice", importMode === "copy" && "selected")}><input type="radio" checked={importMode === "copy"} onChange={() => setImportMode("copy")} /> Copy imports into workspace</label>
          <label className={classNames("choice", importMode === "inplace" && "selected")}><input type="radio" checked={importMode === "inplace"} onChange={() => setImportMode("inplace")} /> Work in place</label>
          <button className="btn primary" onClick={createProject}><Icon name="plus" /> Create project</button>
        </section>
      </div>
    </Modal>
  );
}

function ModelPicker({ models, selected, query, setQuery, visionOnly, setVisionOnly, onClose, onSelect }) {
  const filtered = models.filter((model) => {
    const haystack = `${model.id} ${model.name || ""} ${model.description || ""}`.toLowerCase();
    const modalities = [...(model.architecture?.input_modalities || []), model.architecture?.modality || "", model.description || ""].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase()) && (!visionOnly || /image|vision|multimodal/.test(modalities) || model.id.includes("gemini"));
  }).slice(0, 120);
  return (
    <Modal wide title="Choose model" onClose={onClose}>
      <div className="model-tools"><input placeholder="Search models, vendors, slugs..." value={query} onChange={(e) => setQuery(e.target.value)} /><button className="btn" aria-pressed={visionOnly} onClick={() => setVisionOnly(!visionOnly)}><Icon name="image" /> Vision only</button></div>
      <div className="model-list mt-scroll">
        {filtered.map((model) => <button key={model.id} className={selected === model.id ? "active" : ""} onClick={() => onSelect(model.id)}><b>{modelLabel(model)}</b><code>{model.id}</code><span>{compactNumber(model.context_length)} ctx · {formatPricing(model.pricing)}</span>{selected === model.id && <Icon name="check" />}</button>)}
      </div>
    </Modal>
  );
}

function SettingsModal({ state, onClose, onSave, showToast }) {
  const [tab, setTab] = useState("prompt");
  const [prompt, setPrompt] = useState(state.settings.systemPrompt || "");
  return (
    <Modal wide title="Settings" onClose={onClose}>
      <div className="settings-grid">
        <nav>{["prompt", "languages", "workspace", "images", "account", "shortcuts"].map((id) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{id}</button>)}</nav>
        <section>
          {tab === "prompt" && <><p>The system prompt used for full page, crop, and queue submissions.</p><textarea className="prompt-box" value={prompt} onChange={(e) => setPrompt(e.target.value)} /><button className="btn primary sm" onClick={async () => { await onSave({ systemPrompt: prompt }); showToast("Prompt saved."); }}>Save prompt</button></>}
          {tab === "languages" && <div className="form-grid"><label>Source<select value={state.settings.sourceLanguage || "Auto"} onChange={(e) => onSave({ sourceLanguage: e.target.value })}>{LANGUAGES.map((l) => <option key={l}>{l}</option>)}</select></label><label>Target<select value={state.settings.targetLanguage || "English"} onChange={(e) => onSave({ targetLanguage: e.target.value })}>{LANGUAGES.filter((l) => l !== "Auto").map((l) => <option key={l}>{l}</option>)}</select></label></div>}
          {tab === "workspace" && <pre>{`Root: ${state.workspaceRoot || "not set"}\nProject: ${state.activeProject?.path || "none"}\noriginals/\npages/\ncrops/\ncache/api-images/\nexports/`}</pre>}
          {tab === "images" && <p>Originals are untouched. API requests use the original image when model-compatible, otherwise a high-quality cache copy is generated in `cache/api-images/`.</p>}
          {tab === "account" && <p>{state.hasOpenRouterKey ? `Connected. ${state.keyInfo?.usage ? `$${state.keyInfo.usage} usage recorded by OpenRouter key endpoint.` : "Key info available when OpenRouter returns it."}` : "Not connected."}</p>}
          {tab === "shortcuts" && <div className="shortcut-list">{[["V", "Select"], ["C", "Crop"], ["H", "Pan"], ["Shift Enter", "Send"], ["Q", "Queue"]].map(([k, v]) => <p key={k}><span className="kbd">{k}</span>{v}</p>)}</div>}
        </section>
      </div>
    </Modal>
  );
}

function AccountModal({ state, onClose, onRefresh, showToast }) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const migrateLegacyKey = async () => {
    try {
      await api("/api/auth/openrouter/migrate-legacy", { method: "POST", body: JSON.stringify({}) });
      await onRefresh();
      showToast("Legacy OpenRouter key connected locally.");
      onClose();
    } catch (error) {
      showToast(error.message);
    }
  };
  const saveKey = async () => {
    setBusy(true);
    try {
      await api("/api/auth/openrouter/key", { method: "POST", body: JSON.stringify({ key }) });
      await onRefresh();
      showToast("OpenRouter key validated and saved locally.");
      onClose();
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="OpenRouter account" onClose={onClose}>
      <p>{state.hasOpenRouterKey ? "OpenRouter is connected locally." : "Connect OpenRouter, paste an API key, or reuse the legacy local key if available."}</p>
      {!state.hasOpenRouterKey && <p className="notice">If the OpenRouter popup shows a 409 app/auth-code error, that happens before MangaTranslator receives a callback. The manual key and legacy-key options below avoid that flow.</p>}
      {state.authError && <p className="notice danger">Last OpenRouter callback error: {state.authError}</p>}
      <button className="btn primary" onClick={async () => { const data = await api("/api/auth/openrouter/start"); window.open(data.url, "_blank", "width=960,height=800"); showToast("OpenRouter login opened."); setTimeout(onRefresh, 5000); }}><Icon name="sparkle" /> Connect OpenRouter</button>
      {state.legacyOpenRouterKeyAvailable && !state.hasOpenRouterKey && <button className="btn ghost" onClick={migrateLegacyKey}><Icon name="key" /> Use legacy local key</button>}
      <div className="key-row"><input type="password" placeholder="sk-or-v1-..." value={key} onChange={(e) => setKey(e.target.value)} /><button className="btn" disabled={busy || !key.trim()} onClick={saveKey}>{busy ? "Checking..." : "Save key"}</button></div>
      {state.keyInfo && <pre>{JSON.stringify(state.keyInfo, null, 2)}</pre>}
    </Modal>
  );
}

function ExportModal({ page, onClose, onExport }) {
  const [scope, setScope] = useState("project");
  const [format, setFormat] = useState("md");
  const [include, setInclude] = useState({ source: true, draft: true, final: true, notes: true, boxes: true, decisions: true });
  return (
    <Modal title="Export translation" onClose={onClose}>
      <div className="choice-grid"><label className={classNames("choice", scope === "page" && "selected")}><input type="radio" checked={scope === "page"} onChange={() => setScope("page")} /> This page <span>{page?.file_name || "none"}</span></label><label className={classNames("choice", scope === "project" && "selected")}><input type="radio" checked={scope === "project"} onChange={() => setScope("project")} /> Whole project</label></div>
      <div className="hstack">{["md", "json", "csv"].map((id) => <button key={id} className="btn sm" aria-pressed={format === id} onClick={() => setFormat(id)}>{id.toUpperCase()}</button>)}</div>
      {Object.keys(include).map((key) => <label key={key} className="choice"><input type="checkbox" checked={include[key]} onChange={(e) => setInclude({ ...include, [key]: e.target.checked })} /> Include {key}</label>)}
      <div className="hstack"><span className="spacer" /><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={() => onExport({ scope, format, include, pageId: page?.id })}>Export</button></div>
    </Modal>
  );
}

function DecisionsModal({ project, decisions, onClose, onSave }) {
  const [rows, setRows] = useState(decisions);
  const update = (index, patch) => setRows((items) => items.map((item, i) => i === index ? { ...item, ...patch } : item));
  const remove = (index) => setRows((items) => items.filter((_, i) => i !== index));
  const grouped = rows.reduce((groups, row, index) => {
    const category = row.category || "Terms";
    if (!groups[category]) groups[category] = [];
    groups[category].push({ ...row, index });
    return groups;
  }, {});
  const categories = [...GUIDE_SECTIONS, ...Object.keys(grouped).filter((category) => !GUIDE_SECTIONS.includes(category))];
  const addDecision = (category = "Terms") => setRows([...rows, { id: idForClient("decision"), category, term: "", rule: "" }]);
  return (
    <Modal wide title={`Project Guide · ${project?.name || "project"}`} onClose={onClose}>
      <div className="guide-intro">
        <span className="pill">project-wide</span>
        <p>Rules here are exported with the project and summarized compactly for the model. Keep them short, specific, and worth repeating.</p>
      </div>
      <div className="decision-list mt-scroll">
        {categories.map((category) => {
          const items = grouped[category] || [];
          return (
          <section key={category} className="decision-section">
            <header>
              <div><span className="section-label">{items.length || "No"} rule{items.length === 1 ? "" : "s"}</span><h3>{category}</h3></div>
            </header>
            <div className="decision-table">
              {items.map((row) => (
                <div key={row.id || row.index} className="decision-row">
                  <input value={row.term || ""} onChange={(e) => update(row.index, { term: e.target.value })} placeholder="Term, name, honorific..." aria-label={`${category} term`} />
                  <input value={row.rule || ""} onChange={(e) => update(row.index, { rule: e.target.value })} placeholder="How this project should handle it" aria-label={`${category} rule`} />
                  <button className="btn icon sm ghost" onClick={() => remove(row.index)} title="Delete rule" aria-label="Delete guide rule"><Icon name="trash" /></button>
                </div>
              ))}
              <button className="decision-add" onClick={() => addDecision(category)}><Icon name="plus" /> Add</button>
            </div>
          </section>
          );
        })}
        {!rows.length && <div className="quiet">Add guide rules for names, honorifics, SFX treatment, and tone.</div>}
      </div>
      <div className="hstack modal-actions"><button className="btn ghost" onClick={() => addDecision("Character names")}><Icon name="plus" /> Add character rule</button><span className="spacer" /><button className="btn primary" onClick={async () => { await onSave(rows); onClose(); }}>Save guide</button></div>
    </Modal>
  );
}

function TypesettingPlaceholder() {
  return <main className="typesetting"><Icon name="type" size={32} /><h1>Typesetting</h1><p>Place final translations back onto the page with text-clearing, balloon fills, font rules, flattened PNG export, and layered output. Queued after translation mode feels excellent.</p><div><b>Shipping order</b><span>Image cleaning</span><span>Text placement linked to finals</span><span>Font management</span><span>Layered export</span></div></main>;
}

function AppDialog({ dialog }) {
  const [value, setValue] = useState(dialog.value || "");
  const submit = (event) => {
    event.preventDefault();
    if (dialog.type === "prompt") dialog.onConfirm(value);
    else dialog.onConfirm();
  };
  return (
    <div className="overlay" onMouseDown={dialog.onCancel}>
      <form className="modal dialog-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <header><h2>{dialog.title}</h2><button type="button" className="btn icon sm ghost" onClick={dialog.onCancel} title="Cancel" aria-label="Cancel"><Icon name="close" /></button></header>
        <div className="modal-pane">
          <p>{dialog.message}</p>
          {dialog.type === "prompt" && <input autoFocus value={value} placeholder={dialog.placeholder || ""} onChange={(event) => setValue(event.target.value)} />}
        </div>
        <div className="hstack modal-actions">
          <span className="spacer" />
          <button type="button" className="btn ghost" onClick={dialog.onCancel}>Cancel</button>
          <button className={classNames("btn", dialog.danger ? "danger" : "primary")}>{dialog.confirmLabel || "Confirm"}</button>
        </div>
      </form>
    </div>
  );
}

function Modal({ title, children, onClose, wide }) {
  return <div className="overlay" onMouseDown={onClose}><section className={classNames("modal", wide && "wide")} onMouseDown={(e) => e.stopPropagation()}><header><h2>{title}</h2><button className="btn icon sm ghost" onClick={onClose} title="Close" aria-label="Close"><Icon name="close" /></button></header>{children}</section></div>;
}

function readFileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function safeJson(value, fallback) {
  try { return JSON.parse(value || ""); } catch { return fallback; }
}

function idForClient(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeRect(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}

function labelType(label = "") {
  const up = label.toUpperCase();
  if (up.startsWith("SFX")) return "sfx";
  if (up.startsWith("N")) return "narration";
  return "speech";
}

function normalizeLineType(type = "", label = "") {
  const value = String(type || "").toLowerCase();
  if (["speech", "dialogue", "dialog", "spoken"].includes(value)) return "speech";
  if (["sfx", "sound effect", "sound_effect", "sound-effect", "onomatopoeia"].includes(value)) return "sfx";
  if (["narration", "narrative", "caption", "narrator"].includes(value)) return "narration";
  return labelType(label);
}

function nextCropLabel(crops) {
  return `S${crops.filter((crop) => crop.type === "speech").length + 1}`;
}

function nextScratchLabel(rows) {
  return `S${rows.filter((row) => row.type === "speech").length + 1}`;
}

function formatPricing(pricing = {}) {
  const prompt = Number(pricing.prompt);
  const completion = Number(pricing.completion);
  if (!Number.isFinite(prompt) && !Number.isFinite(completion)) return "$?/M";
  return `$${Number.isFinite(prompt) ? (prompt * 1_000_000).toFixed(2) : "?"}/M · $${Number.isFinite(completion) ? (completion * 1_000_000).toFixed(2) : "?"}/M`;
}

createRoot(document.getElementById("root")).render(<App />);
