import { Globe } from "lucide-react";

// Languages offered for AI question generation. The chosen value (a plain
// language name) is sent as `language` to /api/ai/generate; "" = default
// (English / the model's default). Includes the main Indian + J&K languages.
export const AI_LANGUAGES = [
  "English",
  "Hindi",
  "Urdu",
  "Kashmiri",
  "Dogri",
  "Punjabi",
  "Bengali",
  "Marathi",
  "Gujarati",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Odia",
  "Assamese",
  "Nepali",
  "Sanskrit",
  "Arabic",
  "Persian",
  "French",
  "Spanish",
];

// Reusable "Question language" dropdown used across the AI generation modals
// (Generate, PDF-topics, Import-from-source). Controlled component.
export default function LanguageSelect({ value, onChange, className = "", label = "Question language" }) {
  return (
    <div className={className}>
      <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
        <Globe className="h-4 w-4 text-brand-600" /> {label}
      </label>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} className="input">
        <option value="">Default (English)</option>
        {AI_LANGUAGES.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>
      <p className="mt-1 text-xs text-slate-400">Questions, options and explanations are written in this language.</p>
    </div>
  );
}
