# Event background assets

Directory: `public/events/backgrounds/`

## Current files (PNG)

Photorealistic location atmosphere images used as FightScope event card/page backgrounds.

| File | Used for |
|------|----------|
| `vegas.png` | Las Vegas events / Contender Series Vegas |
| `paris.png` | Paris / France (e.g. Hooker vs Parnasse) |
| `mexico.png` | Noche UFC + Mexico locations |
| `abu-dhabi.png` | Abu Dhabi |
| `shanghai.png` | Shanghai / China |
| `new-york.png` | New York |
| `los-angeles.png` | Los Angeles, Sacramento, Oklahoma City, Salt Lake, etc. |
| `philadelphia.png` | Philadelphia |
| `arena-default.png` / `default.png` | Fallback arena atmosphere |

## Notes

- Mapping logic: `src/lib/event-backgrounds.ts`
- These PNGs were generated as launch stand-ins when outbound Wikimedia/Unsplash downloads were blocked in the agent environment.
- To replace with licensed photography, run: `npm run events:fetch-backgrounds` (writes `.jpg` from Wikimedia Commons). Then update `eventBackgroundSrc` extensions if needed.
- Do not hotlink remote URLs in production.
