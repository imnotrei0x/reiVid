# reiVid

A browser-based video editor that allows you to crop, trim and more - directly in your browser. 

No server-side processing is required.

## Features
- **Crop Video**: Use a draggable overlay to define your desired area.
- **Trim Video**: Adjust start and end points with a dual-slider timeline.
- **Real-Time Preview**: See your edits before exporting.
- **Multiple Formats**: Export as MP4, WebM, or GIF.
- **Device-Aware**: Intelligent memory and capability checks.
- **Privacy-Focused**: Works entirely in your browser—no uploads or data sharing.

## Usage
1. **Upload a Video**: Click "Start Editing" and select a video file.
2. **Memory Check**: Your device's capabilities will be checked for the selected file.
3. **Crop**: Adjust the red corner points of the overlay to crop your video.
4. **Trim**: Use the blue and red sliders on the timeline to set the start and end points.
5. **Choose Format**: Select your desired output format (MP4, WebM, or GIF).
6. **Download**: Click "Download Video" to process and save the edited video to your device.

## Technical Details
- **Frontend**: Built with vanilla JavaScript and minimal CSS.
- **Video Processing**: Powered by [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm), a WebAssembly build of FFmpeg.
- **Device Awareness**: Uses browser APIs to check device capabilities.
- **Hosting**: Designed for browser-only operation; no server interaction required.

## License
This project is open source under the [MIT License](./LICENSE).

---

## Acknowledgments
This project uses **FFmpeg** via the [@ffmpeg/ffmpeg](https://github.com/ffmpegwasm/ffmpeg.wasm) library.

FFmpeg is a free, open-source multimedia framework licensed under:
- [GPLv3](https://www.gnu.org/licenses/gpl-3.0.html) 
- [LGPLv3](https://www.gnu.org/licenses/lgpl-3.0.html)

The source code for FFmpeg is available at [ffmpeg.org](https://ffmpeg.org/).

If you appreciate the work done by the FFmpeg team, consider supporting their project directly through their [donation page](https://www.ffmpeg.org/donations.html).

---

## Contributing
Contributions are welcome! If you have ideas, suggestions, or find bugs, feel free to:
- Open an issue
- Submit a pull request

---

## Support
This project is free to use. 

If you find it useful, consider supporting its development by donating through the [donation link here](https://reivid.vercel.app/donate.html).

Additionally, support the FFmpeg project that powers this tool by donating to them at [https://www.ffmpeg.org/donations.html](https://www.ffmpeg.org/donations.html).

---

## Socials
- twitter [@imnotrei0x](https://x.com/reiloaded)

---
