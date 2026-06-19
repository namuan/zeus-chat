# Horizontal scroll with formatted tables on iOS

## The conflict

Rendering a **formatted table** (header row + data rows + per‑cell styling) that is **wider than the screen** requires two competing layout mechanics on the same axis:

| Layer | What it needs |
|---|---|
| Vertical `ScrollView` / `FlatList` (chat list) | A **fixed, predictable cell height** so it can compute `contentSize` and scroll position. |
| Horizontal `ScrollView` inside the cell | Width‐driven layout where the inner content’s **height depends on its own measurement** (text wrapping, cell padding, line breaks). |

On iOS these measurements happen during layout, and each measurement can trigger a re‑measurement of the other — a **layout feedback loop**. The result is **height inflation**: the cell grows 1 000 pt → 3 000 pt → 5 000 pt with every render frame until the app janks or the JS thread blocks.

## Attempts (and why they failed)

### 1. View‑hierarchy table with GestureHandlerScrollView

```tsx
// TableBlock: View > View rows > View cells > renderInline() → ~590 nested Text nodes
<GestureHandlerScrollView horizontal>
  <View>{/* header row */}</View>
  <View>{/* data rows */}</View>
</GestureHandlerScrollView>
```

**Result:** Extreme height inflation (dt: 5 332 ms reported by VirtualizedList). The deep View hierarchy triggered repeated `onContentSizeChange` callbacks that fed back into `FlatList`’s cell‑height estimation.

### 2. Switched to RN’s built‑in `ScrollView`

Same View hierarchy, but with RN’s core `ScrollView` instead of RNGH’s wrapper. Added `contentContainerStyle={{ flexGrow: 0 }}` so the inner scroller didn’t stretch.

**Result:** Inflation persisted. The layout feedback wasn’t caused by the gesture‑handler wrapper — it was the simple existence of a nested scroller.

### 3. Height‑locking via `onContentSizeChange` + `useState`

```tsx
const [lockedHeight, setLockedHeight] = useState<number | null>(null);
const prevContentKey = useRef('');

useEffect(() => {
  const key = JSON.stringify([headers, rows]);
  if (key !== prevContentKey.current) {
    prevContentKey.current = key;
    setLockedHeight(null); // unlock only when content changes
  }
}, [headers, rows]);

<ScrollView
  style={lockedHeight !== null ? { height: lockedHeight } : undefined}
  onContentSizeChange={(_w, h) => {
    if (lockedHeight === null && h > 0) setLockedHeight(h);
  }}
/>
```

**Result:** Worked until `FlatList` unmounted and remounted the cell (virtualization recycling). On remount, `prevContentKey` was a fresh ref (`''`), so the lock reset and the inflation started again.

### 4. Performance tuning on `FlatList`

```tsx
<FlatList
  maxToRenderPerBatch={3}
  windowSize={5}
  removeClippedSubviews={false}
/>
```

**Result:** Made things **worse** — cells were unmounted/remounted even more aggressively, destroying the `useRef` based content key on every mount.

### 5. Memoizing `parseBlocks` in MarkdownRenderer

```tsx
const blocks = useMemo(() => parseBlocks(content), [content]);
```

**Result:** No effect. Parsing was already fast; the issue was in layout measurement, not JavaScript execution time.

### 6. Monospace plain‑text table (like code block)

Replaced the View hierarchy with a single `<Text>` using `fontFamily: Fonts.mono` inside the horizontal `ScrollView` — the exact same structure as the `CodeBlock` (which never inflated).

```tsx
<ScrollView horizontal nestedScrollEnabled contentContainerStyle={{ flexGrow: 0 }}>
  <Text style={{ fontFamily: Fonts.mono, fontSize: 12 }}>
    {headers.join(' | ')}
    {separator}
    {rows.join('\n')}
  </Text>
</ScrollView>
```

**Result:** Height inflation still occurred. Even a trivial `ScrollView > Text` layout caused feedback when nested inside a `FlatList` cell on iOS. The code‑block didn’t inflate because it never contained enough text to trigger the threshold (~1 400 pt of vertical content in a 118‑row table vs a typical 10‑line code block).

### 7. FlatList → ScrollView

Replaced the outer `FlatList` with a plain `ScrollView`. This eliminated cell virtualization entirely — every message bubble is mounted once and never recycled.

**Result:** The layout feedback loop disappeared because the outerscroller no longer measures individual cell heights for recycling. However, horizontal scroll on the table still didn’t work reliably — the outer vertical `ScrollView` would sometimes capture the horizontal gesture.

### 8. Pre‑calculated height + explicit content width — ✅ no inflation, ❌ no scroll

**Diagnosis refined.** The previous attempts proved the issue wasn’t the horizontal `ScrollView` itself — it was the **measurement feedback loop**: `onContentSizeChange` / `onLayout` callbacks fire, the virtualizer re‑estimates the cell height, constraints flow back down, the horizontal scroller measures again — ad infinitum. The code‑block never triggered this because its content was too short to cross the virtualizer’s re‑estimate threshold.

**Solution (height inflation fixed).** Pre‑calculate both height and width before layout. No measurement callbacks. No state. Both dimensions are derived purely from the content:

```tsx
function TableBlock({ headers, align, rows }) {
  // Width: sum of per‑column widths (computed from longest cell in each column)
  const { columnWidths, tableWidth } = useMemo(() => {
    const widths = headers.map((h, ci) => {
      const maxLen = Math.max(h.length, ...rows.map(r => (r[ci] ?? '').length));
      return Math.max(maxLen * 8 + 32, 90);
    });
    const total = widths.reduce((s, w) => s + w, 0) + widths.length * hairlineWidth;
    return { columnWidths: widths, tableWidth: total };
  }, [headers, rows]);

  // Height: (1 header + N data rows) * rowHeight + border
  const height = useMemo(
    () => (1 + rows.length) * 28 + hairlineWidth,
    [rows],
  );

  return (
    <View style={{ height }}>
      <ScrollView horizontal nestedScrollEnabled>
        <View style={[styles.table, { width: tableWidth }]}>
          {/* styled rows with border, alternating colors, explicit column widths */}
        </View>
      </ScrollView>
    </View>
  );
}
```

Key properties:
- **Height is a pure function of content** — no `onContentSizeChange`, no `onLayout`, no state.
- **Survives virtualization** — a remounted cell recalculates the same values.
- **No measurement feedback** — the parent receives a stable cell height from the first layout pass.
- **No `flex: 1` on cells** — every cell gets an explicit computed `width`, eliminating the width‑instability feedback loop.
- **FlashList** (`@shopify/flash-list`) as the message list — measures cells in a background pass, handles dynamic heights natively, has `maintainVisibleContentPosition` designed for chat UIs.

**Result:** ✅ Height inflation eliminated — tables with 100+ rows render at a stable height. ❌ Horizontal scrolling **does not work** — the inner `ScrollView` does not respond to horizontal gestures. Probable causes under investigation:

1. **FlashList gesture conflict** — as a vertical `RecyclerListView`, FlashList may intercept horizontal pan gestures before the inner `ScrollView` receives them, even with `nestedScrollEnabled`.
2. **iOS nested‑scroller gesture arbitration** — the combination of a `FlashList` (native vertical recycler) + `ScrollView` (horizontal) creates a gesture ownership conflict that `nestedScrollEnabled` alone cannot resolve.
3. **Render‑target measurement** — FlashList renders items first as `Measurement` targets (offscreen, opacity‑0). During this pass the horizontal `ScrollView` may not correctly establish its content‑size → viewport relationship.

### Attempts still worth investigating

- **`simultaneousHandlers` from `react-native-gesture-handler`** — wrap the inner `ScrollView` with a `GestureDetector` / `PanGestureHandler` that allows simultaneous recognition with the parent list.
- **Custom `ScrollView` replacement** — use a plain `View` with `PanResponder` to implement custom horizontal pan → offset animation, bypassing both `ScrollView` and the gesture system entirely.
- **`pagingEnabled` on the horizontal `ScrollView`** — changes the gesture recognition model; the outer list may yield horizontal drags differently.
- **Render table as a `<Text>` with monospace font** inside a horizontal `ScrollView` with `width: tableWidth * estimatedCharPx` — the simpler `ScrollView > Text` structure has different layout characteristics than `ScrollView > View > rows > cells`.
- **Accept clipping** — remove the horizontal `ScrollView` entirely; wide tables are clipped at the bubble boundary. Users toggle raw‑mode for full table visibility.
- **Expand‑to‑modal** — tap a clipped table to open a full‑screen `Modal` with a dedicated horizontal `ScrollView` (no nested‑scroller conflict).

### 9. Tap‑to‑expand modal — ✅ working

**Gesture‑arbitration proven.** Diagnostic `onScrollBeginDrag` logging confirmed touches reach the table `ScrollView` but drag events never fire. The issue is `FlashList`'s native `RecyclerListView` claiming pan gestures before RN's `ScrollResponder` can start.

**Solution.** Render the styled table **without a horizontal `ScrollView`** inside the message bubble. If the table is wider than the bubble, it clips gracefully with an overlay hint (`← scroll →`). Tapping the table opens a full‑screen `Modal` with a dedicated horizontal `ScrollView`. Since the modal lives outside FlashList's view hierarchy, there is **no gesture conflict**. Horizontal scrolling works perfectly in the modal.

```tsx
function TableBlock({ headers, align, rows }) {
  const { width: screenWidth } = useWindowDimensions();
  const availableWidth = screenWidth - padding;
  const needsScroll = tableWidth > availableWidth;

  return (
    <>
      {/* Inline — clipped, tap to expand */}
      <TouchableOpacity
        activeOpacity={needsScroll ? 0.7 : 1}
        disabled={!needsScroll}
        onPress={() => setExpanded(true)}>
        <View style={{ height, overflow: 'hidden' }}>
          {/* styled table View */}
        </View>
        {needsScroll && <View>{'← scroll →'}</View>}
      </TouchableOpacity>

      {/* Full‑screen modal — no FlashList, no gesture conflict */}
      <Modal visible={expanded}>
        <ScrollView horizontal>
          {/* same styled table View, full width */}
        </ScrollView>
      </Modal>
    </>
  );
}
```

**Result:** ✅ Height stable. ✅ Styled table rendered. ✅ Horizontal scroll works in modal. ✅ No gesture conflict (modal has its own responder chain).

## Revised conclusion

> A horizontally scrolling child whose height is **re‑measured and fed back** into a virtualized parent creates a measurement feedback loop on iOS.

The fix is to **make the content height stable and deterministic**, either by:

1. **Pre‑calculation** (as above) when content height can be derived from structure.
2. **External caching** (module‑level `Map` keyed by content hash) so the value survives component remount.
3. **Switching to `FlashList`** (`@shopify/flash-list`) which has a different measurement model that handles dynamic‑height items more gracefully.

This project has **solved the height inflation** (tables no longer grow to 5000+ pt) using a combination of pre‑calculated height, explicit column widths (no `flex: 1`), and `FlashList`. However, **horizontal scrolling remains non‑functional** — the inner horizontal `ScrollView` does not respond to swipe gestures. The current hypothesis is a **gesture arbitration conflict** between FlashList (vertical `RecyclerListView`) and the nested `ScrollView`, which `nestedScrollEnabled` alone cannot resolve.

Many production React Native apps (spreadsheets, comparison tables, carousels, chip rows, calendars) nest horizontal scrollers inside virtualized lists — they succeed because they ensure the inner scroller’s height is **stable** AND resolve the gesture architecture (often via `react-native-gesture-handler`’s `Gesture.Pan().activeOffsetX()` / `simultaneousHandlers`).

### Current state

| Concern | Status |
|---|---|
| Height inflation (5000+ pt cell) | ✅ Fixed |
| Styled table (borders, header, alternating rows) | ✅ Working |
| Horizontal scroll (inline, in‑message) | ❌ Blocked by FlashList gesture capture |
| Horizontal scroll (full‑screen modal) | ✅ Working |
| Message list performance | ✅ FlashList handles dynamic heights |
| Raw markdown toggle (fallback) | ✅ Always available |
