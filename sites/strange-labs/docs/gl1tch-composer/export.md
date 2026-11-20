# Export and inscribe

1. Type a title in the box at the top. It becomes the page title of your piece.
2. Press **Export**. The window shows the finished HTML and its size in bytes.
3. Press **Download .html** (or **Copy HTML** to paste it somewhere).
4. Inscribe the file with any inscribing tool, as `text/html`.

That's it. The piece runs as soon as the inscription is on chain.

## Why it's so small

Your file doesn't carry the gl1tches or your art inside it. It points at them: every layer is loaded from its own inscription by ID, the way ordinals pieces load each other. So a piece with five layers can still be a few thousand bytes, and costs little to inscribe.

## Before you inscribe

* **Check the switch says Inscribe.** A file exported in Demo mode shows a warning and must not be inscribed (see [Add your own art](your-art.md)).
* **Make sure every layer has loaded** on the canvas. If one shows blank in the composer, it will be blank on chain too.
* **Block mode** reads the block height from the chain, so it only cycles once inscribed.
* **Chance mode** picks from the inscription ID, so you only see the real pick once inscribed. Use **Test id** to preview.
