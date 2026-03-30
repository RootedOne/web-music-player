"use client";

import { useState } from "react";
import { Wrench, Search, CheckCircle2, AlertTriangle, ArrowRight, Save, X, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

type EntityType = "Track" | "Artist" | "Playlist";
type PreviewResult = {
  id: string;
  originalValue: string;
  newValue: string;
};

export default function BulkEditPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [entity, setEntity] = useState<EntityType>("Track");
  const [field, setField] = useState<string>("title");
  const [search, setSearch] = useState("");
  const [replace, setReplace] = useState("");
  const [isRegex, setIsRegex] = useState(false);
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);

  // Preview State
  const [previewResults, setPreviewResults] = useState<PreviewResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Confirm State
  const [confirmText, setConfirmText] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const validFields: Record<EntityType, string[]> = {
    Track: ["title", "album"],
    Artist: ["name"],
    Playlist: ["name", "description"],
  };

  const handleEntityChange = (newEntity: EntityType) => {
    setEntity(newEntity);
    setField(validFields[newEntity][0]);
  };

  const handlePreview = async () => {
    if (!search && !isRegex) {
      toast.error("Please enter a search term.");
      return;
    }

    setLoading(true);
    try {
      // In a basic auth environment, window.location.origin includes credentials
      // which fetch() rejects. We can strip them or just use a relative path
      // However, relative path fetch("/api...") also fails if the page was loaded with basic auth
      // because the browser tries to resolve it against the current URL (which has credentials).
      // Wait, standard fetch("/api/admin/bulk-edit") *does* work if we don't include credentials in the URL
      // If the user accessed it via http://admin:admin@localhost:3000/... then relative fetch
      // will resolve to http://admin:admin@localhost:3000/api... which fetch blocks.
      // To fix this, we can construct the URL without username/password:
      const url = new URL("/api/admin/bulk-edit", window.location.href);
      url.username = '';
      url.password = '';

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          entity,
          field,
          search,
          replace,
          isRegex,
          isCaseSensitive,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate preview");
      }

      setPreviewResults(data.results);
      setSelectedIds(new Set(data.results.map((r: PreviewResult) => r.id)));
      setStep(2);

      if (data.results.length === 0) {
        toast("No matching records found.", { icon: "ℹ️" });
      } else {
        toast.success(`Found ${data.results.length} matching records.`);
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(previewResults.map((r) => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const executeUpdate = async () => {
    if (confirmText !== "CONFIRM") {
      toast.error("Please type CONFIRM to execute.");
      return;
    }

    setLoading(true);
    try {
      const updates = previewResults
        .filter((r) => selectedIds.has(r.id))
        .map((r) => ({ id: r.id, newValue: r.newValue }));

      const url = new URL("/api/admin/bulk-edit", window.location.href);
      url.username = '';
      url.password = '';

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          entity,
          field,
          updates,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to execute updates");
      }

      toast.success(data.message || `Successfully updated ${data.count} records.`);
      setShowConfirmModal(false);
      setStep(1);
      setPreviewResults([]);
      setSearch("");
      setReplace("");
      setConfirmText("");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#fa243c] flex items-center justify-center shadow-[0_0_15px_rgba(250,36,60,0.5)]">
          <Wrench className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bulk Metadata Edit</h1>
          <p className="text-gray-400 text-sm">Find and replace strings across multiple records.</p>
        </div>
      </div>

      <div className="bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        {/* Step 1: Configuration */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-white border-b border-white/10 pb-4">
              <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-[#fa243c]">1</span>
              Configuration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Entity</label>
                <select
                  value={entity}
                  onChange={(e) => handleEntityChange(e.target.value as EntityType)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#fa243c]/50 focus:border-transparent transition-all"
                >
                  <option value="Track">Tracks</option>
                  <option value="Artist">Artists</option>
                  <option value="Playlist">Playlists</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Target Field</label>
                <select
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#fa243c]/50 focus:border-transparent transition-all"
                >
                  {validFields[entity].map((f) => (
                    <option key={f} value={f}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex justify-between">
                  <span>Search For</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., ' | abc.com'"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#fa243c]/50 focus:border-transparent transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Replace With</label>
                <input
                  type="text"
                  placeholder="Leave blank to remove"
                  value={replace}
                  onChange={(e) => setReplace(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#fa243c]/50 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={isCaseSensitive}
                    onChange={(e) => setIsCaseSensitive(e.target.checked)}
                    className="appearance-none w-5 h-5 border-2 border-white/20 rounded md:rounded bg-transparent checked:bg-[#fa243c] checked:border-[#fa243c] transition-all cursor-pointer"
                  />
                  {isCaseSensitive && <CheckCircle2 className="absolute w-3 h-3 text-white pointer-events-none" />}
                </div>
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Case Sensitive</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={isRegex}
                    onChange={(e) => setIsRegex(e.target.checked)}
                    className="appearance-none w-5 h-5 border-2 border-white/20 rounded md:rounded bg-transparent checked:bg-[#fa243c] checked:border-[#fa243c] transition-all cursor-pointer"
                  />
                  {isRegex && <CheckCircle2 className="absolute w-3 h-3 text-white pointer-events-none" />}
                </div>
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Use Regular Expression (Regex)</span>
              </label>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handlePreview}
                disabled={loading || (!search && !isRegex)}
                className="bg-[#fa243c] hover:bg-[#fa243c]/90 text-white font-medium py-3 px-6 rounded-xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                Preview Changes
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Preview Results */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-[#fa243c]">2</span>
                Preview Results
              </h2>
              <button
                onClick={() => setStep(1)}
                className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>

            {previewResults.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500/50" />
                <p>No records found matching your criteria.</p>
                <button
                  onClick={() => setStep(1)}
                  className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm transition-colors"
                >
                  Go Back & Adjust
                </button>
              </div>
            ) : (
              <>
                <div className="bg-black/50 border border-white/10 rounded-xl overflow-hidden max-h-[60vh] flex flex-col">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-300">
                      <thead className="text-xs text-gray-400 bg-white/5 uppercase sticky top-0 backdrop-blur-md">
                        <tr>
                          <th className="px-4 py-3 w-12">
                            <input
                              type="checkbox"
                              checked={selectedIds.size === previewResults.length && previewResults.length > 0}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                              className="appearance-none w-4 h-4 border border-white/20 rounded bg-transparent checked:bg-[#fa243c] checked:border-[#fa243c] transition-all cursor-pointer relative flex items-center justify-center before:content-[''] before:absolute before:w-2 before:h-2 before:bg-white before:rounded-sm checked:before:block before:hidden"
                            />
                          </th>
                          <th className="px-4 py-3">ID</th>
                          <th className="px-4 py-3">Current Value ({field})</th>
                          <th className="px-4 py-3">Proposed Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {previewResults.map((result) => (
                          <tr key={result.id} className={`hover:bg-white/5 transition-colors ${!selectedIds.has(result.id) ? 'opacity-50' : ''}`}>
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(result.id)}
                                onChange={(e) => handleSelectOne(result.id, e.target.checked)}
                                className="appearance-none w-4 h-4 border border-white/20 rounded bg-transparent checked:bg-[#fa243c] checked:border-[#fa243c] transition-all cursor-pointer relative flex items-center justify-center before:content-[''] before:absolute before:w-2 before:h-2 before:bg-white before:rounded-sm checked:before:block before:hidden"
                              />
                            </td>
                            <td className="px-4 py-3 font-mono text-xs truncate max-w-[100px]">{result.id.slice(0, 8)}...</td>
                            <td className="px-4 py-3 line-clamp-2 max-w-xs">{result.originalValue}</td>
                            <td className="px-4 py-3 text-green-400 line-clamp-2 max-w-xs">{result.newValue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="text-sm text-gray-300">
                    Selected <span className="font-bold text-white">{selectedIds.size}</span> of <span className="font-bold text-white">{previewResults.length}</span> records
                  </div>
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={selectedIds.size === 0}
                    className="w-full sm:w-auto bg-[#fa243c] hover:bg-[#fa243c]/90 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                  >
                    Confirm & Apply
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6 flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
               </div>
               <div>
                 <h3 className="text-xl font-bold text-white">Execute Bulk Update?</h3>
                 <p className="text-sm text-gray-400 mt-1">
                   You are about to modify <strong className="text-white">{selectedIds.size}</strong> records. This action cannot be undone.
                 </p>
               </div>
            </div>

            <div className="space-y-4">
              <div className="bg-black/50 border border-red-500/30 rounded-xl p-4">
                 <p className="text-sm text-red-400 font-medium mb-2">To proceed, please type <strong>CONFIRM</strong> below:</p>
                 <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="CONFIRM"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all font-mono"
                 />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeUpdate}
                  disabled={confirmText !== "CONFIRM" || loading}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Execute Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
