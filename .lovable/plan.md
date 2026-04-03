

## Fix: Seamless Pi Camera Reconnection

### Problem
The Supabase edge function (`camera-proxy`) has an execution time limit of ~150 seconds (2.5 minutes). When it hits this limit, the MJPEG stream ends, triggering a visible reconnection cycle with loading indicators and a brief black screen.

### Root Cause
When the stream naturally ends (edge function timeout), the code at line ~413-423 in `useNetworkCamera.ts` sets `setIsConnected(false)` and `setIsConnecting(true)`, which causes the UI to flash a loading/reconnecting state even though the camera is fine.

### Plan

**1. Make natural stream cycling truly invisible (useNetworkCamera.ts)**
- When a stream ends after running for >10 seconds with many frames (a "natural cycle"), do NOT update `isConnected`/`isConnecting` state — keep the UI showing the last frame
- Start the new connection in the background via `startOverlappingConnection` without any state changes
- Only update connection state if the new connection actually fails

**2. Pre-emptive reconnection before timeout (useNetworkCamera.ts)**
- Add a `MAX_CONNECTION_AGE` constant of ~140 seconds (just under the edge function limit)
- In the stall check interval, also check connection age. If it exceeds `MAX_CONNECTION_AGE`, proactively start a new overlapping connection before the edge function kills the old one
- This eliminates any gap between the old stream dying and the new one starting

**3. Keep last frame visible during reconnection (useNetworkCamera.ts)**
- In `startOverlappingConnection`, do NOT clear `imgElement.src` — let the old frame remain displayed until the first frame of the new connection arrives
- Only revoke the old blob URL after the new frame is rendered

### Technical Details

The stall check interval (every 2 seconds) will gain a second condition:
```
if connectionAge > 140s → start overlapping connection proactively
```

The natural stream cycle handler (lines 412-423) will change from:
```
setIsConnected(false); setIsConnecting(true);
```
to simply calling `startOverlappingConnection` with no state changes, keeping the UI stable.

### Files Changed
- `src/hooks/useNetworkCamera.ts` — seamless cycling + pre-emptive reconnect

