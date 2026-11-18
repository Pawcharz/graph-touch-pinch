# Graph Touch Pinch

Pinch with two fingers to zoom the graph view in Obsidian on Windows touchscreens (2-in-1 laptops, tablets, touch monitors).

## The problem

On phones and tablets, the Obsidian app lets you pinch-zoom the graph. On Windows, the desktop app doesn't: two fingers on the graph just drag it around.

The cause: Obsidian's graph only runs its pinch code for browser *touch events*. The Windows desktop app never sends touch events; fingers arrive only as *pointer events*. The graph treats those like a mouse drag.

## What this plugin does

While two fingers are on the graph (or the local graph), the plugin stops the graph from reading them as a drag. It zooms around the point between your fingers instead, using the same zoom math Obsidian uses on mobile. Moving both fingers together pans the view.

Everything else is left alone: one-finger drag, mouse and scroll wheel behave exactly as before. If your first finger had grabbed a note, the plugin lets go of it when the second finger lands.

## Installation

From Obsidian: **Settings → Community plugins → Browse**, search for "Graph Touch Pinch", install and enable.

Manually: download `main.js` and `manifest.json` from the [latest release](https://github.com/Pawcharz/graph-touch-pinch/releases/latest) into `<your vault>/.obsidian/plugins/graph-touch-pinch/`. Then enable the plugin under **Settings → Community plugins**.

## Compatibility

- Desktop only. On iOS and Android, Obsidian's own pinch-zoom already works.
- Built and tested on Obsidian 1.15.1, Windows 11, with a touchscreen.
- The plugin uses parts of the graph view's internals that aren't in the public plugin API. A future Obsidian update could change them and break pinch-zoom. If that happens, please [open an issue](https://github.com/Pawcharz/graph-touch-pinch/issues) with your Obsidian version.

## License

[MIT](LICENSE)
