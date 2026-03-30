Before Virtuoso (Simulated):
If 5000 items are loaded into the grid, the browser renders `5000 items * 20 DOM nodes per TrackCard ≈ 100,000 DOM nodes`.
This results in massive "DOM Explosion", locking up the main thread on initial paint (TTFMP) and causing massive lag during scrolling.

After Virtuoso (Actual):
With `<VirtuosoGrid>`, the DOM only contains elements for the currently visible viewport + an overscan buffer.
No matter if there are 50 tracks or 5000 tracks loaded in the `myTracks` array in memory, the DOM Node count for the list remains completely constant at roughly ~30-50 rendered DOM cards.
The total document DOM size stays safely under 2,000 nodes total, ensuring 60fps scrolling and instantaneous initial rendering!
