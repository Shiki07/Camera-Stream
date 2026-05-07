## Remove rpicamalert.xyz banner from dashboard

**File:** `src/pages/Index.tsx` (lines 48–59)

Remove the "Need just one camera? Visit rpicamalert.xyz" paragraph and the vertical divider that separates it from the VPN warning. Keep the amber banner container and the "VPN not supported for Raspberry Pi features" message.

**Memory update:** Update `mem://index.md` Core rule to drop "Show `rpicamalert.xyz` banner for single-camera users" so it isn't reintroduced later.

No other files reference this banner.