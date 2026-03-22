"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Loader2 } from "lucide-react";

type ConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
}: ConfirmModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[70]" onClose={onClose}>
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
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-[#121212] border border-[#282828] p-6 text-left align-middle shadow-2xl transition-all">
                <Dialog.Title as="h3" className="text-xl font-extrabold leading-6 text-white mb-2">
                  {title}
                </Dialog.Title>

                <div className="mt-2">
                  <p className="text-sm text-gray-400">
                    {description}
                  </p>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-full bg-transparent px-5 py-2 text-sm font-bold text-white hover:scale-105 active:scale-95 transition focus:outline-none"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    {cancelText}
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    className={`inline-flex justify-center items-center rounded-full border border-transparent px-5 py-2 text-sm font-bold hover:scale-105 active:scale-95 transition focus:outline-none disabled:opacity-50 ${
                      isDestructive
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-white text-black hover:bg-gray-200"
                    }`}
                    onClick={handleConfirm}
                  >
                    {isLoading ? <Loader2 className={`w-4 h-4 mr-2 animate-spin ${isDestructive ? 'text-white' : 'text-black'}`} /> : null}
                    {confirmText}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
