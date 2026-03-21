"use client";

import { Fragment, useState, useEffect } from "react";
import { Menu, Transition, Dialog } from "@headlessui/react";
import { MoreHorizontal, Plus, Share2, Edit2, Loader2, Music, Trash2, X } from "lucide-react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import ConfirmModal from "./modals/ConfirmModal";

type TrackOptionsProps = {
  trackId: string;
  trackOwnerId: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onRemoveFromPlaylist?: () => void;
};

type Playlist = { id: string; name: string };

export default function TrackOptions({ trackId, trackOwnerId, onEdit, onDelete, onRemoveFromPlaylist }: TrackOptionsProps) {
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isOwner = session?.user && (session.user as any).id === trackOwnerId;

  useEffect(() => {
    if (isModalOpen) {
      fetchPlaylists();
    }
  }, [isModalOpen]);

  const fetchPlaylists = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/playlists");
      if (res.ok) {
        setPlaylists(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const addToPlaylist = async (playlistId: string) => {
    setError("");
    try {
      const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        toast.success("Added to playlist!");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add track");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred");
    }
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/track/${trackId}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Track link copied!");
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success("Track link copied!");
      } catch (err) {
        console.error(err);
      }
      document.body.removeChild(textArea);
    }
  };

  const deleteTrack = async () => {
    try {
      const res = await fetch(`/api/tracks/${trackId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Track deleted successfully.");
        if (onDelete) onDelete();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete track");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsDeleteConfirmOpen(false);
    }
  };

  const handleRemoveFromPlaylist = () => {
    if (onRemoveFromPlaylist) {
      onRemoveFromPlaylist();
      setIsRemoveConfirmOpen(false);
    }
  };

  return (
    <>
      <Menu as="div" className="relative inline-block text-left">
        <div>
          <Menu.Button
            className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700/50 transition focus:outline-none"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <MoreHorizontal className="w-5 h-5" />
          </Menu.Button>
        </div>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 bottom-full mb-2 w-48 origin-bottom-right rounded-md bg-gray-800 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden divide-y divide-gray-700">
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
                    className={`${active ? "bg-gray-700 text-white" : "text-gray-300"} group flex w-full items-center px-4 py-2.5 text-sm font-medium transition-colors`}
                  >
                    <Plus className="mr-3 h-4 w-4" />
                    Add to Playlist
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={(e) => { e.stopPropagation(); copyShareLink(); }}
                    className={`${active ? "bg-gray-700 text-white" : "text-gray-300"} group flex w-full items-center px-4 py-2.5 text-sm font-medium transition-colors`}
                  >
                    <Share2 className="mr-3 h-4 w-4" />
                    Share Track
                  </button>
                )}
              </Menu.Item>
            </div>

            {isOwner && (
              <div className="py-1">
                {onEdit && (
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(); }}
                      className={`${active ? "bg-gray-700 text-white" : "text-gray-300"} group flex w-full items-center px-4 py-2.5 text-sm font-medium transition-colors`}
                    >
                      <Edit2 className="mr-3 h-4 w-4" />
                      Edit Details
                    </button>
                  )}
                </Menu.Item>
                )}
                {onDelete && (
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsDeleteConfirmOpen(true); }}
                        className={`${active ? "bg-red-900/50 text-red-400" : "text-red-500"} group flex w-full items-center px-4 py-2.5 text-sm font-medium transition-colors`}
                      >
                        <Trash2 className="mr-3 h-4 w-4" />
                        Delete Track
                      </button>
                    )}
                  </Menu.Item>
                )}
              </div>
            )}

            {onRemoveFromPlaylist && (
               <div className="py-1">
                 <Menu.Item>
                   {({ active }) => (
                     <button
                       onClick={(e) => { e.stopPropagation(); setIsRemoveConfirmOpen(true); }}
                       className={`${active ? "bg-red-900/50 text-red-400" : "text-gray-400 hover:text-white"} group flex w-full items-center px-4 py-2.5 text-sm font-medium transition-colors`}
                     >
                       <X className="mr-3 h-4 w-4" />
                       Remove from Playlist
                     </button>
                   )}
                 </Menu.Item>
               </div>
            )}
          </Menu.Items>
        </Transition>
      </Menu>

      {/* Modals */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={deleteTrack}
        title="Delete Track?"
        description="Are you sure you want to permanently delete this track? This action cannot be undone."
        confirmText="Delete"
        isDestructive={true}
      />

      <ConfirmModal
        isOpen={isRemoveConfirmOpen}
        onClose={() => setIsRemoveConfirmOpen(false)}
        onConfirm={handleRemoveFromPlaylist}
        title="Remove from Playlist?"
        description="Are you sure you want to remove this track from the playlist?"
        confirmText="Remove"
        isDestructive={true}
      />

      {/* Add to Playlist Modal */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
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
                    Add to Playlist
                  </Dialog.Title>

                  {error && <p className="text-red-400 text-sm mb-4 bg-red-900/20 p-2 rounded">{error}</p>}

                  <div className="max-h-64 overflow-y-auto space-y-2 mt-4 custom-scrollbar">
                    {isLoading ? (
                      <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>
                    ) : playlists.length === 0 ? (
                      <p className="text-gray-400 text-sm">You haven&apos;t created any playlists yet.</p>
                    ) : (
                      playlists.map(pl => (
                         <button
                           key={pl.id}
                           onClick={() => addToPlaylist(pl.id)}
                           className="w-full text-left px-4 py-3 rounded-md hover:bg-[#282828] transition flex items-center gap-3 text-white font-medium"
                         >
                           <div className="w-10 h-10 bg-[#181818] flex items-center justify-center rounded-sm">
                             <Music className="w-5 h-5 text-gray-400" />
                           </div>
                           {pl.name}
                         </button>
                      ))
                    )}
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-full border border-transparent bg-white px-6 py-2.5 text-sm font-bold text-black hover:scale-105 active:scale-95 transition focus:outline-none"
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
