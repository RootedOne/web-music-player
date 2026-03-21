"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Loader2, Upload } from "lucide-react";

type EditModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title: string;
  endpoint: string;
  initialName: string;
  nameFieldLabel: string;
  nameFieldKey: string;
};

export default function EditModal({
  isOpen,
  onClose,
  onSuccess,
  title,
  endpoint,
  initialName,
  nameFieldLabel,
  nameFieldKey,
}: EditModalProps) {
  const [name, setName] = useState(initialName);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData();
    formData.append(nameFieldKey, name);
    if (coverFile) {
      formData.append("coverFile", coverFile);
    }

    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        body: formData,
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#121212] border border-[#282828] p-6 text-left align-middle shadow-2xl transition-all">
                <Dialog.Title as="h3" className="text-xl font-extrabold leading-6 text-white mb-6">
                  {title}
                </Dialog.Title>

                {error && <p className="text-red-400 text-sm mb-4 bg-red-900/20 p-3 rounded font-medium border border-red-900/50">{error}</p>}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">{nameFieldLabel}</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 bg-[#242424] text-white rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-white transition-all placeholder-gray-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">Custom Cover Image (Optional)</label>
                    <div className="mt-1 flex justify-center rounded-md border border-dashed border-[#404040] bg-[#181818] px-6 py-8 hover:border-gray-400 transition-colors">
                      <div className="text-center">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" aria-hidden="true" />
                        <div className="mt-4 flex text-sm leading-6 text-gray-400 justify-center">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer rounded-md font-bold text-white focus-within:outline-none hover:underline"
                          >
                            <span>Upload a file</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  setCoverFile(e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs leading-5 text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
                        {coverFile && <p className="text-xs text-white mt-3 font-bold bg-[#282828] p-2 rounded truncate max-w-full">Selected: {coverFile.name}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-[#282828]">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-full bg-transparent px-6 py-2.5 text-sm font-bold text-white hover:scale-105 active:scale-95 transition focus:outline-none"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex justify-center items-center rounded-full border border-transparent bg-white px-6 py-2.5 text-sm font-bold text-black hover:scale-105 active:scale-95 transition focus:outline-none disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-black" /> : null}
                      Save Changes
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
