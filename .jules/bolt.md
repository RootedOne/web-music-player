## 2024-05-24 - Optimizing TrackCard lists in React
**Learning:** In highly dynamic list components (like grids of `TrackCard`s that accept callback props), a simple `React.memo` is often defeated by the parent component passing new function references on every render.
**Action:** When memoizing list items that take callbacks, either use a custom comparison function in `React.memo` to ignore function identity changes if safe (like simple refetch triggers), or ensure the parent uses `useCallback` for all passed functions.
