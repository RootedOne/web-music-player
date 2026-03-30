# Bolt's Performance Journal

## 2024-05-20 - [SQLite ORDER BY RANDOM() vs Memory Shuffle]
**Learning:** We assumed that `ORDER BY RANDOM()` in SQLite would be a massive bottleneck for fetching random tracks because it requires assigning random values and sorting O(N log N). We wrote an O(N) Fisher-Yates shuffle implementation that fetched all IDs via Prisma and sorted them in Node.js memory. Surprisingly, when benchmarking with 10,000 mock tracks, SQLite's `ORDER BY RANDOM()` took ~2.1ms while fetching the IDs + shuffling in Node took ~27.7ms. The IPC (Inter-Process Communication) and object serialization overhead of Prisma pulling 10,000 objects across the boundary was more expensive than SQLite's highly-optimized C-based native sorting engine.
**Action:** Do not blindly replace `ORDER BY RANDOM()` with memory-shuffling on SQLite/Prisma unless the table size is significantly larger (e.g. 100k+) where the DB sort actually begins to break down. Always measure Prisma serialization overhead.

## 2024-05-20 - [React Render Thrashing via HTML5 Audio]
**Learning:** High-frequency events (like `<audio onTimeUpdate>` which fires multiple times a second) should never directly mutate global state stores (like Zustand or Redux) if that state is consumed by many components. In `PlayerBar.tsx`, mapping `currentTime` directly to `setProgress` in the global `playerStore` caused every single component subscribed to the player to re-render ~20 times a second ("a wall of flame" in React DevTools Profiler).
**Action:** Keep high-frequency updates local (e.g. `useState` or `useRef` driving a slider in `PlayerBar`), and throttle/debounce the synchronization to the global store (e.g. updating Zustand only once every 1000ms or when the user finishes scrubbing). This pattern eliminates app-wide render thrashing while maintaining UI smoothness.

## 2024-05-20 - [DOM Explosion & Structural Optimization]
**Learning:** Returning all tracks via `findMany()` in a single payload and rendering them in a massive `.map()` inside React creates a "DOM Explosion". For a library of 5,000 tracks, this creates roughly ~100,000 DOM nodes (20 nodes per TrackCard). The sheer volume locks up the main thread during the initial render phase (massive Time to First Meaningful Paint), causes extreme lag during scrolling as the browser tries to calculate layout, and consumes significant device memory.
**Action:** Always implement a two-pronged "Windowing" approach for large datasets:
1. **Backend Cursor Pagination:** Use `limit` and `cursor` in Prisma to fetch data in small batches (e.g., 50), dramatically reducing initial payload size and database stress.
2. **Frontend Virtualization:** Use a library like `react-virtuoso` (specifically `VirtuosoGrid` for CSS Grids) to recycle DOM nodes as the user scrolls. This changes the O(N) DOM rendering complexity into O(1) constant memory usage (usually maintaining < 1,000 nodes total regardless of the array size in state).
