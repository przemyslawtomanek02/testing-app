import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles, Send, Loader, KeyRound, ExternalLink, Paperclip, X,
  AlertTriangle, CheckCircle2, FileText, Settings2, Eraser, RefreshCw, Square,
} from "lucide-react";

import { useAppContext } from "../../AppContext.jsx";

/* Klucz API zyje tylko w sessionStorage przegladarki - nie dotyka bazy
   ani dysku serwera. Zamkniecie karty = klucz znika. */
const keyStorageName = (provider) => `ai_generator_key_${provider}`;

const TYPE_LABELS = {
  SingleChoice: "Jednokrotny wybór",
  MultipleChoice: "Wielokrotny wybór",
  TrueFalse: "Prawda / fałsz",
  FillInTheBlank: "Luki (przeciąganie)",
  TypedFillInBlank: "Luki (wpisywane)",
  DragAndDropOrder: "Kolejność",
  MatchingMultiple: "Dopasowanie par",
  Rating: "Skala",
};

const DIFFICULTIES = [
  { id: "easy", label: "Łatwy" },
  { id: "medium", label: "Średni" },
  { id: "hard", label: "Trudny" },
  { id: "mixed", label: "Mieszany" },
];

const DEFAULT_TYPES = ["SingleChoice", "MultipleChoice", "TrueFalse"];

function QuestionPreview({ question, index, T }) {
  const answers = question.answers || [];

  return (
    <div style={{
      border: `1px solid ${T.border}`, borderRadius: "12px",
      padding: "12px 14px", background: T.inputBg,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <span style={{
          fontSize: "11px", fontWeight: 600, color: "#2B73FF",
          background: "rgba(43,115,255,0.12)", padding: "2px 8px", borderRadius: "999px",
        }}>
          {index + 1}. {TYPE_LABELS[question.type] || question.type}
        </span>
        <span style={{ fontSize: "11px", color: T.textMuted }}>
          {question.points_value} pkt
        </span>
      </div>

      <div style={{ fontSize: "13px", color: T.text, marginBottom: answers.length ? "8px" : 0 }}>
        {question.question}
      </div>

      {question.type === "MatchingMultiple" ? (
        <div style={{ display: "grid", gap: "4px" }}>
          {answers.map((a, i) => (
            <div key={i} style={{ fontSize: "12px", color: T.textSec }}>
              {a.left?.text} <span style={{ color: T.textMuted }}>→</span> {a.right?.text}
            </div>
          ))}
        </div>
      ) : question.type === "Rating" ? (
        <div style={{ fontSize: "12px", color: T.textSec }}>
          Skala {question.extra_data?.available_range?.join("–")}
          {question.extra_data?.correct_enabled
            ? `, poprawna wartość: ${question.extra_data.correct_value}`
            : ", bez poprawnej odpowiedzi"}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "3px" }}>
          {answers.map((a, i) => {
            const correct = a.is_correct === true;
            const scored = question.type === "SingleChoice"
              || question.type === "MultipleChoice"
              || question.type === "TrueFalse";
            return (
              <div key={i} style={{
                fontSize: "12px",
                color: scored && correct ? "#17A34A" : T.textSec,
                fontWeight: scored && correct ? 600 : 400,
              }}>
                {scored ? (correct ? "✓ " : "• ") : "• "}{a.text}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AiGeneratorPanel({ onUseDraft }) {
  const { darkMode: dk } = useAppContext();
  const T = {
    bg:        dk ? "#0F1117" : "#F4F6FB",
    surface:   dk ? "#171B2D" : "#FFFFFF",
    border:    dk ? "#2A2F45" : "#E4E6EB",
    text:      dk ? "#E2E8F0" : "#0F1623",
    textSec:   dk ? "#8896B3" : "#64748B",
    textMuted: dk ? "#5A6483" : "#94A3B8",
    inputBg:   dk ? "#1E2237" : "#FFFFFF",
    chip:      dk ? "#1E2237" : "#F1F5FB",
  };

  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState("google");
  const [model, setModel] = useState("");
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");

  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState("medium");
  const [language, setLanguage] = useState("polski");
  const [points, setPoints] = useState(1);
  const [types, setTypes] = useState(DEFAULT_TYPES);

  const [sourceText, setSourceText] = useState("");
  const [documents, setDocuments] = useState([]);
  const [showOptions, setShowOptions] = useState(true);

  const [prompt, setPrompt] = useState("");
  const [entries, setEntries] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState(null);
  const [sourcePayload, setSourcePayload] = useState(null);

  const fileInputRef = useRef(null);
  const logEndRef = useRef(null);
  const abortRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);

  const activeProvider = useMemo(
    () => providers.find(p => p.id === provider) || null,
    [providers, provider],
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/ai/providers", { credentials: "include" });
        if (!res.ok) throw new Error("Nie udało się pobrać listy dostawców.");
        const data = await res.json();
        setProviders(data.providers || []);
      } catch (err) {
        toast.error(err.message);
      }
    })();
  }, []);

  /* Przy zmianie dostawcy czyscimy model i liste - nazwy modeli roznia sie
     miedzy dostawcami i bywaja wycofywane, wiec nic nie zgadujemy. */
  useEffect(() => {
    if (!activeProvider) return;
    setModel("");
    setModels([]);
    setModelsError("");
    setBaseUrl(activeProvider.default_base_url || "");
    try {
      setApiKey(sessionStorage.getItem(keyStorageName(provider)) || "");
    } catch {
      setApiKey("");
    }
  }, [activeProvider, provider]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries, isGenerating]);

  /* Generowanie trwa od kilku sekund do ponad minuty - bez licznika
     wyglada to jak zawieszenie aplikacji. */
  useEffect(() => {
    if (!isGenerating) { setElapsed(0); return; }
    const startedAt = Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [isGenerating]);

  /* Liste modeli pobiera dostawca - dzieki temu nie trafimy na model
     wycofany po stronie API (np. 404 "no longer available to new users"). */
  const loadModels = useCallback(async (keyOverride) => {
    const key = (keyOverride ?? apiKey).trim();
    if (!key || !activeProvider) return;

    setModelsLoading(true);
    setModelsError("");
    try {
      const res = await fetch("/api/admin/ai/models", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-AI-Api-Key": key },
        body: JSON.stringify({
          provider: activeProvider.id,
          base_url: activeProvider.needs_base_url ? baseUrl : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Nie udało się pobrać listy modeli.");

      const list = data.models || [];
      setModels(list);
      if (list.length === 0) {
        setModelsError("Dostawca nie zwrócił żadnego modelu — wpisz nazwę ręcznie.");
      } else {
        setModel(prev => (list.some(m => m.id === prev) ? prev : ""));
      }
    } catch (err) {
      setModels([]);
      setModelsError(err.message);
    } finally {
      setModelsLoading(false);
    }
  }, [apiKey, activeProvider, baseUrl]);

  const persistKey = (value) => {
    setApiKey(value);
    try {
      if (value) sessionStorage.setItem(keyStorageName(provider), value);
      else sessionStorage.removeItem(keyStorageName(provider));
    } catch {
      /* tryb prywatny - klucz zostaje tylko w stanie komponentu */
    }
  };

  const toggleType = (type) => {
    setTypes(prev => prev.includes(type)
      ? (prev.length > 1 ? prev.filter(t => t !== type) : prev)
      : [...prev, type]);
  };

  const handleAttach = (event) => {
    const files = Array.from(event.target.files || []);
    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: plik przekracza 10 MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = String(e.target.result).split(",")[1] || "";
        setDocuments(prev => [...prev, {
          filename: file.name,
          media_type: file.type || "application/pdf",
          data: base64,
          size: file.size,
        }]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const buildHistory = useCallback(() => entries.flatMap((entry) => {
    if (entry.kind === "user") return [{ role: "user", content: entry.text }];
    if (entry.kind === "result") {
      return [{
        role: "assistant",
        content: `Wygenerowano test "${entry.test.test_name}" z ${entry.test.questions.length} pytaniami.`,
      }];
    }
    return [];
  }), [entries]);

  const generate = async () => {
    const text = prompt.trim();
    if (!text) {
      toast.error("Opisz, jaki test ma powstać.");
      return;
    }
    if (!apiKey.trim()) {
      toast.error("Wklej klucz API wybranego dostawcy.");
      return;
    }
    if (!model.trim()) {
      toast.error("Wybierz model — kliknij odświeżenie listy obok pola.");
      return;
    }

    const history = buildHistory();
    setEntries(prev => [...prev, { kind: "user", text }]);
    setPrompt("");
    setIsGenerating(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/admin/ai/generate", {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "X-AI-Api-Key": apiKey.trim(),
        },
        body: JSON.stringify({
          provider,
          model,
          base_url: activeProvider?.needs_base_url ? baseUrl : null,
          prompt: text,
          history,
          num_questions: Number(numQuestions) || 10,
          question_types: types,
          difficulty,
          language,
          points_per_question: Number(points) || 1,
          source_text: sourceText || null,
          documents: documents.map(({ filename, media_type, data }) => ({ filename, media_type, data })),
          current_test: sourcePayload,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.message || "Generowanie nie powiodło się.");

      setDraft(data.test);
      setSourcePayload(data.source_payload || null);
      setEntries(prev => [...prev, {
        kind: "result",
        test: data.test,
        warnings: data.warnings || [],
        usage: data.usage || {},
      }]);
    } catch (err) {
      if (err.name === "AbortError") {
        setEntries(prev => [...prev, { kind: "error", text: "Generowanie przerwane." }]);
      } else {
        setEntries(prev => [...prev, { kind: "error", text: err.message }]);
        toast.error(err.message);
      }
    } finally {
      abortRef.current = null;
      setIsGenerating(false);
    }
  };

  const cancelGeneration = () => abortRef.current?.abort();

  const resetConversation = () => {
    setEntries([]);
    setDraft(null);
    setSourcePayload(null);
  };

  const inputStyle = {
    width: "100%", padding: "8px 12px", borderRadius: "12px",
    border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text,
    fontSize: "13px", outline: "none", boxSizing: "border-box",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  };
  const labelStyle = {
    display: "block", fontSize: "12px", fontWeight: 600,
    color: T.textSec, marginBottom: "5px",
  };
  const cardStyle = {
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: "16px", padding: "16px",
  };

  return (
    <div style={{ padding: "28px", background: T.bg, minHeight: "100%" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: T.text, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={18} color="#2B73FF"/> AI Generator
            </h1>
            <p style={{ fontSize: "12px", color: T.textSec, marginTop: "4px" }}>
              Opisz test — model przygotuje pytania, a Ty sprawdzisz je w edytorze przed zapisem.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" onClick={() => setShowOptions(v => !v)} style={{
              display: "flex", alignItems: "center", gap: "6px", border: `1.5px solid ${T.border}`,
              background: T.surface, color: T.textSec, padding: "7px 14px", borderRadius: "999px",
              cursor: "pointer", fontSize: "13px", fontWeight: 500,
            }}>
              <Settings2 size={14}/> {showOptions ? "Ukryj ustawienia" : "Ustawienia"}
            </button>
            {entries.length > 0 && (
              <button type="button" onClick={resetConversation} style={{
                display: "flex", alignItems: "center", gap: "6px", border: `1.5px solid ${T.border}`,
                background: T.surface, color: T.textSec, padding: "7px 14px", borderRadius: "999px",
                cursor: "pointer", fontSize: "13px", fontWeight: 500,
              }}>
                <Eraser size={14}/> Nowa rozmowa
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: showOptions ? "minmax(0,1fr) 320px" : "minmax(0,1fr)", gap: "20px", alignItems: "start" }}>

          {/* ─── Rozmowa + draft ─────────────────────────────── */}
          <div style={{ ...cardStyle, display: "flex", flexDirection: "column", minHeight: "520px" }}>
            <div style={{ flex: 1, overflowY: "auto", maxHeight: "560px", display: "grid", gap: "12px", paddingRight: "4px" }}>
              {entries.length === 0 && !isGenerating && (
                <div style={{ color: T.textMuted, fontSize: "13px", textAlign: "center", padding: "48px 16px", lineHeight: 1.7 }}>
                  Napisz np.<br/>
                  <span style={{ color: T.textSec }}>
                    „Test z podstaw baz danych: normalizacja, klucze, JOIN-y — 12 pytań”
                  </span>
                  <br/><br/>
                  Możesz też wkleić materiał z wykładu albo dołączyć PDF,
                  żeby pytania pochodziły z Twoich treści.
                </div>
              )}

              <AnimatePresence initial={false}>
                {entries.map((entry, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ display: "flex", justifyContent: entry.kind === "user" ? "flex-end" : "flex-start" }}
                  >
                    {entry.kind === "user" ? (
                      <div style={{
                        background: "#2B73FF", color: "#FFFFFF", padding: "9px 14px",
                        borderRadius: "16px 16px 4px 16px", fontSize: "13px", maxWidth: "80%",
                      }}>
                        {entry.text}
                      </div>
                    ) : entry.kind === "error" ? (
                      <div style={{
                        border: "1px solid rgba(220,38,38,0.35)", background: "rgba(220,38,38,0.08)",
                        color: "#DC2626", padding: "10px 14px", borderRadius: "16px 16px 16px 4px",
                        fontSize: "13px", maxWidth: "90%", display: "flex", gap: "8px",
                      }}>
                        <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: "1px" }}/>
                        <span>{entry.text}</span>
                      </div>
                    ) : (
                      <div style={{ width: "100%" }}>
                        <div style={{
                          display: "flex", alignItems: "center", gap: "8px",
                          marginBottom: "10px", flexWrap: "wrap",
                        }}>
                          <CheckCircle2 size={15} color="#17A34A"/>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: T.text }}>
                            {entry.test.test_name}
                          </span>
                          <span style={{ fontSize: "12px", color: T.textMuted }}>
                            {entry.test.questions.length} pytań
                            {entry.usage?.output_tokens
                              ? ` · ${entry.usage.input_tokens + entry.usage.output_tokens} tokenów`
                              : ""}
                          </span>
                          {/* Przycisk przy kazdym wyniku - inaczej latwo wczytac
                              inna generacje niz ta, na ktora sie patrzy. */}
                          <button type="button" onClick={() => onUseDraft?.(entry.test)} style={{
                            marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px",
                            border: `1.5px solid ${draft === entry.test ? "#2B73FF" : T.border}`,
                            background: draft === entry.test ? "rgba(43,115,255,0.12)" : T.surface,
                            color: draft === entry.test ? "#2B73FF" : T.textSec,
                            fontWeight: 600, padding: "5px 12px", borderRadius: "999px",
                            cursor: "pointer", fontSize: "12px",
                          }}>
                            <FileText size={13}/> Wczytaj te {entry.test.questions.length} pytań
                          </button>
                        </div>

                        {entry.warnings.length > 0 && (
                          <div style={{
                            border: "1px solid rgba(217,119,6,0.35)", background: "rgba(217,119,6,0.08)",
                            borderRadius: "12px", padding: "10px 12px", marginBottom: "10px",
                          }}>
                            {entry.warnings.map((w, wi) => (
                              <div key={wi} style={{ fontSize: "12px", color: "#B45309", display: "flex", gap: "6px" }}>
                                <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: "2px" }}/> {w}
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ display: "grid", gap: "8px" }}>
                          {entry.test.questions.map((q, qi) => (
                            <QuestionPreview key={qi} question={q} index={qi} T={T}/>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {isGenerating && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", color: T.textSec, fontSize: "13px" }}>
                  <Loader size={15} className="animate-spin"/>
                  <span>Model generuje pytania… {elapsed}s</span>
                  {elapsed >= 25 && (
                    <span style={{ fontSize: "11px", color: T.textMuted }}>
                      {`${numQuestions} pytań z tyloma typami potrafi zająć minutę — możesz przerwać i poprosić o mniej.`}
                    </span>
                  )}
                  <button type="button" onClick={cancelGeneration} style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    border: `1.5px solid ${T.border}`, background: T.surface, color: T.textSec,
                    padding: "4px 10px", borderRadius: "999px", cursor: "pointer", fontSize: "11px",
                  }}>
                    <Square size={10}/> Przerwij
                  </button>
                </div>
              )}
              <div ref={logEndRef}/>
            </div>

            {draft && (
              <div style={{
                marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${T.border}`,
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap",
              }}>
                <span style={{ fontSize: "12px", color: T.textSec }}>
                  Ostatnia generacja: <strong>{draft.questions.length} pytań</strong>. Draft nie jest
                  zapisany — sprawdź je w edytorze. Starszą generację wczytasz przyciskiem przy niej.
                </span>
                <button type="button" onClick={() => onUseDraft?.(draft)} style={{
                  display: "flex", alignItems: "center", gap: "8px", border: "none",
                  background: "#2B73FF", color: "#FFFFFF", fontWeight: 600, padding: "9px 18px",
                  borderRadius: "999px", cursor: "pointer", fontSize: "13px",
                }}>
                  <FileText size={15}/> Wczytaj ostatnie ({draft.questions.length})
                </button>
              </div>
            )}

            {/* ─── Prompt ─────────────────────────────── */}
            <div style={{ marginTop: "12px", display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!isGenerating) generate(); }
                }}
                placeholder={draft
                  ? "Np. zamień pytanie 3 na trudniejsze albo dodaj 5 pytań o indeksach…"
                  : "Opisz test, który ma powstać…"}
                rows={2}
                style={{ ...inputStyle, resize: "vertical", minHeight: "44px" }}
              />
              <input ref={fileInputRef} type="file" accept=".pdf" multiple style={{ display: "none" }} onChange={handleAttach}/>
              <button type="button" title="Dołącz PDF" onClick={() => fileInputRef.current?.click()} style={{
                border: `1.5px solid ${T.border}`, background: T.surface, color: T.textSec,
                padding: "11px", borderRadius: "12px", cursor: "pointer", lineHeight: 0,
              }}>
                <Paperclip size={16}/>
              </button>
              <button
                type="button"
                title={isGenerating ? "Przerwij generowanie" : "Generuj"}
                onClick={isGenerating ? cancelGeneration : generate}
                style={{
                  border: "none", background: isGenerating ? "#DC2626" : "#2B73FF", color: "#FFFFFF",
                  padding: "11px 16px", borderRadius: "12px", cursor: "pointer", lineHeight: 0,
                }}
              >
                {isGenerating ? <Square size={16}/> : <Send size={16}/>}
              </button>
            </div>

            {documents.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                {documents.map((doc, i) => (
                  <span key={i} style={{
                    display: "flex", alignItems: "center", gap: "6px", background: T.chip,
                    border: `1px solid ${T.border}`, borderRadius: "999px", padding: "4px 10px",
                    fontSize: "11px", color: T.textSec,
                  }}>
                    <FileText size={12}/> {doc.filename}
                    <X size={12} style={{ cursor: "pointer" }}
                       onClick={() => setDocuments(prev => prev.filter((_, di) => di !== i))}/>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ─── Ustawienia ─────────────────────────────── */}
          {showOptions && (
            <div style={{ display: "grid", gap: "16px" }}>
              <div style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "12px" }}>
                  <KeyRound size={15} color={T.textSec}/>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: T.text }}>Dostawca i klucz</span>
                </div>

                <label style={labelStyle}>Dostawca</label>
                <select value={provider} onChange={e => setProvider(e.target.value)} style={{ ...inputStyle, marginBottom: "10px" }}>
                  {providers.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>

                <label style={labelStyle}>Model</label>
                <div style={{ display: "flex", gap: "6px", marginBottom: "4px" }}>
                  {models.length > 0 ? (
                    <select value={model} onChange={e => setModel(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                      <option value="">— wybierz model —</option>
                      {models.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.label === m.id ? m.id : `${m.label} (${m.id})`}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={model}
                      onChange={e => setModel(e.target.value)}
                      placeholder="pobierz listę lub wpisz nazwę modelu"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                  )}
                  <button
                    type="button"
                    title="Pobierz modele dostępne dla tego klucza"
                    onClick={() => loadModels()}
                    disabled={modelsLoading || !apiKey.trim()}
                    style={{
                      border: `1.5px solid ${T.border}`, background: T.surface,
                      color: apiKey.trim() ? T.textSec : T.textMuted,
                      padding: "9px", borderRadius: "12px", lineHeight: 0,
                      cursor: modelsLoading || !apiKey.trim() ? "default" : "pointer",
                    }}
                  >
                    {modelsLoading
                      ? <Loader size={14} className="animate-spin"/>
                      : <RefreshCw size={14}/>}
                  </button>
                </div>
                <p style={{
                  fontSize: "11px", marginBottom: "10px", lineHeight: 1.5,
                  color: modelsError ? "#B45309" : T.textMuted,
                }}>
                  {modelsError
                    || (models.length > 0
                      ? `${models.length} modeli dostępnych dla tego klucza — wybierz jeden z listy.`
                      : "Wklej klucz i kliknij odświeżenie, aby pobrać listę modeli.")}
                </p>

                {activeProvider?.needs_base_url && (
                  <>
                    <label style={labelStyle}>Base URL</label>
                    <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)}
                           placeholder="https://api.openai.com/v1"
                           style={{ ...inputStyle, marginBottom: "10px" }}/>
                  </>
                )}

                <label style={labelStyle}>Klucz API</label>
                <input type="password" value={apiKey} onChange={e => persistKey(e.target.value)}
                       onBlur={e => { if (e.target.value.trim() && models.length === 0) loadModels(e.target.value); }}
                       placeholder="wklej swój klucz" autoComplete="off"
                       style={{ ...inputStyle, marginBottom: "8px" }}/>
                <p style={{ fontSize: "11px", color: T.textMuted, lineHeight: 1.6 }}>
                  Klucz zostaje tylko w tej karcie przeglądarki (sessionStorage) i jest
                  wysyłany do serwera jedynie na czas generowania. Nie trafia do bazy.
                </p>
                {activeProvider?.key_url && (
                  <a href={activeProvider.key_url} target="_blank" rel="noreferrer" style={{
                    display: "inline-flex", alignItems: "center", gap: "5px",
                    fontSize: "11px", color: "#2B73FF", marginTop: "6px", textDecoration: "none",
                  }}>
                    Pobierz klucz <ExternalLink size={11}/>
                  </a>
                )}
                {activeProvider?.note && (
                  <p style={{ fontSize: "11px", color: T.textMuted, marginTop: "6px" }}>{activeProvider.note}</p>
                )}
              </div>

              <div style={cardStyle}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: T.text, display: "block", marginBottom: "12px" }}>
                  Parametry testu
                </span>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                  <div>
                    <label style={labelStyle}>Liczba pytań</label>
                    <input type="number" min={1} max={50} value={numQuestions}
                           onChange={e => setNumQuestions(e.target.value)} style={inputStyle}/>
                  </div>
                  <div>
                    <label style={labelStyle}>Punkty / pytanie</label>
                    <input type="number" min={1} max={20} value={points}
                           onChange={e => setPoints(e.target.value)} style={inputStyle}/>
                  </div>
                </div>

                <label style={labelStyle}>Poziom</label>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={{ ...inputStyle, marginBottom: "10px" }}>
                  {DIFFICULTIES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>

                <label style={labelStyle}>Język pytań</label>
                <input value={language} onChange={e => setLanguage(e.target.value)}
                       placeholder="polski" style={{ ...inputStyle, marginBottom: "12px" }}/>

                <label style={labelStyle}>Typy pytań</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {Object.keys(TYPE_LABELS).map((type) => {
                    const active = types.includes(type);
                    return (
                      <button key={type} type="button" onClick={() => toggleType(type)} style={{
                        border: `1.5px solid ${active ? "#2B73FF" : T.border}`,
                        background: active ? "rgba(43,115,255,0.12)" : T.chip,
                        color: active ? "#2B73FF" : T.textSec,
                        borderRadius: "999px", padding: "5px 11px", fontSize: "11px",
                        fontWeight: active ? 600 : 500, cursor: "pointer",
                      }}>
                        {TYPE_LABELS[type]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={cardStyle}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: T.text, display: "block", marginBottom: "10px" }}>
                  Materiał źródłowy <span style={{ fontWeight: 400, color: T.textMuted }}>(opcjonalnie)</span>
                </span>
                <textarea
                  value={sourceText}
                  onChange={e => setSourceText(e.target.value)}
                  placeholder="Wklej fragment wykładu, skryptu lub notatek — pytania powstaną na jego podstawie."
                  rows={6}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
                <p style={{ fontSize: "11px", color: T.textMuted, marginTop: "8px", lineHeight: 1.6 }}>
                  PDF-y dołączysz spinaczem obok pola promptu
                  {activeProvider && !activeProvider.supports_pdf
                    ? " — wybrany dostawca może nie obsługiwać załączników."
                    : "."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AiGeneratorPanel;
