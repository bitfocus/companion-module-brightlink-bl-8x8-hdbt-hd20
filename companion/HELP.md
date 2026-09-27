## Brightlink BL-8X8-HDBT-HD20 Module

Network control of the BrightLink [BL-8X8-HDBT-HD20 HDMI Matrix](https://brightlinkav.com/products/brightlink-pro-series-hdmi-2-0-8x8-8x16-8x24-hdmi-hdbaset-matrix-with-4kx2k-60hz-hdr-yuv-4-4-4-18gbps-hdcp-1-4-2-2-app-control-distance-upto-70m-228ft-away-c-w-8-hdbaset-receivers-with-2ea-hdmi-outputs-and-poc-poe) over HTTP.

The matrix routes 8 HDMI inputs to 8 HDMI outputs and 8 HDBaseT outputs. **HDMI output N and HDBT output N are one logical output** and always switch together, but they have separate names, separate EDIDs and separate hot-plug state.

### Configuration

| Field | Notes |
|---|---|
| Device IP / FQDN | Address of the matrix. `http://` is optional. |
| Status polling interval | The matrix never reports changes on its own, so all state comes from polling. Default 2000ms; the stock web UI uses 1000ms. |

> **Security.** This device has no working access control. It serves every stored username and password in plaintext to any client that can reach it over HTTP, and its own login page is enforced only in the browser. Keep it on a management VLAN and do not reuse its credentials anywhere else.

### Actions

**Routing**

* **Map IO path** — route one input to one output.
* **Map IO path - multi** — set all 8 outputs at once. Press **Learn** on the action to fill it in from the matrix's current routing.
* **Select input** / **Route selected input to output** — two-step X/Y panel. Press an input, then press each output it should feed. Pressing the selected input again clears the selection.

**Scenes**

* **Scene** — Save, Recall or Clear scene 1-8. Scene names are read from the device.

> Scene Recall can take 15-25 seconds for all signals to reconnect. For fast switching use **Map IO path - multi**, which typically settles in a second or two.

**Audio**

* **Set input audio source** — mute, HDMI embedded, or analog.
* **Set output audio enables** — analog/I²S and S/PDIF outputs.

**EDID**

* **Assign EDID to input** — pick a built-in preset, a user slot, or copy the EDID of the display on an HDMI or HDBT output.
* **Copy display EDID into a user slot**.

**Other**

* **Rename port** — rename an input, HDMI output or HDBT output. Names are limited to 12 characters and cannot contain `;`, `:` or `#`.
* **Get status** — force an immediate status poll.

### Feedbacks

**Routing**

* **Routing matches (all outputs)** — true when every output matches the input chosen for it. Set an output to **Any (not checked)** to leave it out. Supports **Learn**.
* **Specified input is routed to specified output** — true when one output is fed by one input. Supports **Learn**.
* **Input is routed to any output** — true when at least one output is fed by the input. Use it as a "source in use" indicator.
* **Specified input is the selected input** — for X/Y panels.
* **Selected input is routed to output** — for X/Y panels.

> **Showing which routing is live.** The matrix does not report which scene is active, and it cannot read back what a stored scene contains. To light the button for the routing that is live, put **Map IO path - multi** and **Routing matches (all outputs)** on the same button with the same eight inputs. Setting both is quickest with **Learn**: route the matrix by hand, then press Learn on the action and on the feedback. The **1-1 IO map** preset is already set up this way.

**Audio and EDID**

* **Input audio source is** — true when the input's audio is set to mute, HDMI embedded or analog.
* **Output audio output is enabled** — true when the output's analog/I²S or S/PDIF output is on.
* **Input EDID assignment is** — true when the input uses the chosen EDID source and slot.

**Connection**

* **Matrix is connected** — true while status polls succeed. Invert it to warn when the matrix is offline. The other feedbacks keep showing the last state they read while the matrix is offline.
* **Input has a source connected** — true when the input reports `sig=1`.
* **Output has a display connected** — true when the output reports `hpd=1` or reads back an EDID other than `Unplug`. Can be tested against the HDMI half, the HDBT half, or either.

> The matrix reports `pw5v=1` on every input whether or not anything is plugged in, and reports `sig=0` on plenty of outputs that are driving a display. Input `sig` and output `hpd` are the only reliable connection tests, and these feedbacks use them.

### Variables

Per input: `input_N_name`, `input_N_signal`, `input_routeN` (outputs fed by this input).
Per output: `output_N_name`, `output_N_input`, `output_N_input_name`, `output_N_display`, `output_routeN`.
Per HDBT output: `hdbt_N_name`, `hdbt_N_display`.
Per scene: `scene_N_name`.
Selection: `selected_input`, `selected_input_name`.

### Presets

Scene recall, scene save, X/Y routing panel (select input / take to output), a one-press button for every input and output pair that lights when that route is live, input and output signal-presence indicators, a 1-to-1 map macro that lights when the matrix is mapped 1-to-1, and a status refresh button that turns red when the matrix is offline. Preset labels follow the port names configured on the matrix.

### Not supported

The firmware's dispatcher accepts `lcd`, `power`, `system` and `factory` commands, but their behaviour is undocumented and unverified, so they are not exposed. There is no scene-rename command on this device.

### Contributing

The device's HTTP API is reverse-engineered and documented in full at `docs/API_SPEC.md` in this module's repository — also published upstream as [API_SPEC.md in BLMatrixServer](https://github.com/ntbutler87/BLMatrixServer/blob/main/API_SPEC.md). It covers the `#`-framed `/video.set` command grammar, the 160-segment `all_dat.get` state response, and the parsing traps behind both.

Read **§4, Detecting what is actually plugged in**, before touching any connection feedback. On this hardware the two fields that look like "is something plugged in" — input `pw5v` and output `sig` — are the wrong ones, and reading them produces a panel that reports nothing connected while pictures are on screen.

That spec is maintained alongside [BLMatrixServer](https://github.com/ntbutler87/BLMatrixServer), an emulator of this matrix you can develop and test against without hardware on the bench.
