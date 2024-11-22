document.addEventListener('DOMContentLoaded', async () => {
    // Initialize FFmpeg right away
    async function initFFmpeg() {
        try {
            if (typeof FFmpeg === 'undefined') {
                throw new Error('FFmpeg failed to load. Please check your internet connection and try again.');
            }
            
            if (!window.ffmpeg) {
                const { createFFmpeg } = FFmpeg;
                window.ffmpeg = createFFmpeg({
                    log: true,
                    corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'
                });
            }
            
            if (!window.ffmpeg.isLoaded()) {
                await window.ffmpeg.load();
                console.log('FFmpeg loaded successfully');
            }
        } catch (err) {
            console.error('FFmpeg initialization error:', err);
            throw new Error('Failed to initialize video processing. Please try again or use a different browser.');
        }
    }

    await initFFmpeg();

    // Only initialize editor elements if we're in editor mode
    if (document.getElementById('editor').classList.contains('active')) {
        initializeEditor();
    }
});

// Move all editor-specific code into a separate function
function initializeEditor() {
    const fileInput = document.getElementById('fileInput');
    const preview = document.getElementById('preview');
    const videoPreview = document.getElementById('videoPreview');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const timeDisplay = document.getElementById('timeDisplay');
    const timeSlider = document.getElementById('timeSlider');
    const endSlider = document.getElementById('endSlider');
    const cropOverlay = document.getElementById('cropOverlay');
    const cropPoints = document.querySelectorAll('.crop-point');
    const downloadBtn = document.getElementById('downloadBtn');
    const volumeBtn = document.getElementById('volumeBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const formatSelect = document.getElementById('formatSelect');
    
    let isDragging = false;
    let currentPoint = null;
    let startX, startY, startLeft, startTop, startWidth, startHeight;
    let currentVideoUrl = null;
    let selectedQuality = 'original';
    let processedVideoBlob = null;
    let previousVolume = 1;
    let selectedFormat = 'mp4';

    function handleResize() {
        const wrapperRect = cropOverlay.parentElement.getBoundingClientRect();
        
        const newLeft = Math.min(cropOverlay.offsetLeft, wrapperRect.width - cropOverlay.offsetWidth);
        const newTop = Math.min(cropOverlay.offsetTop, wrapperRect.height - cropOverlay.offsetHeight);
        
        cropOverlay.style.left = `${newLeft}px`;
        cropOverlay.style.top = `${newTop}px`;
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function updateTimeDisplay() {
        if (!isNaN(videoPreview.duration)) {
            const endTime = (endSlider.value / 100) * videoPreview.duration;
            timeDisplay.textContent = `${formatTime(videoPreview.currentTime)} / ${formatTime(endTime)}`;
        }
    }

    function resetCropOverlay() {
        cropOverlay.style.top = '0';
        cropOverlay.style.left = '0';
        cropOverlay.style.width = '100%';
        cropOverlay.style.height = '100%';
    }

    function updateVolumeIcon(volume) {
        if (volume === 0) {
            volumeBtn.textContent = '🔇';
        } else if (volume < 0.5) {
            volumeBtn.textContent = '🔉';
        } else {
            volumeBtn.textContent = '🔊';
        }
    }

    window.addEventListener('resize', handleResize);

    fileInput.addEventListener('change', async function(e) {
        processedVideoBlob = null;
        downloadBtn.disabled = true;
        
        const file = e.target.files[0];
        if (file) {
            try {
                document.getElementById('initialUpload').classList.add('hidden');
                document.getElementById('preview').style.display = 'flex';
                
                currentVideoUrl = URL.createObjectURL(file);
                videoPreview.src = currentVideoUrl;
                
                const loadPromise = new Promise((resolve, reject) => {
                    videoPreview.addEventListener('loadedmetadata', resolve, { once: true });
                    videoPreview.addEventListener('error', reject, { once: true });
                });

                await loadPromise;
                
                if (videoPreview.duration < 1) {
                    throw new Error('Video must be at least 1 second long');
                }
                
                timeSlider.value = 0;
                endSlider.value = 100;
                videoPreview.currentTime = 0;
                resetCropOverlay();
                updateTimeDisplay();
                downloadBtn.disabled = false;
                
            } catch (error) {
                console.error('Error:', error);
                alert('Error loading video: ' + error.message);
                videoPreview.src = '';
                cleanupVideoUrl();
                fileInput.value = '';
                downloadBtn.disabled = true;
                document.getElementById('initialUpload').classList.remove('hidden');
                document.getElementById('preview').style.display = 'none';
            }
        }
    });

    playPauseBtn.addEventListener('click', function() {
        if (videoPreview.paused) {
            const startTime = (timeSlider.value / 100) * videoPreview.duration;
            if (Math.abs(videoPreview.currentTime - startTime) > 0.1) {
                videoPreview.currentTime = startTime;
            }
            videoPreview.play();
            playPauseBtn.innerHTML = '&#10074;&#10074;';
        } else {
            videoPreview.pause();
            playPauseBtn.innerHTML = '&#9654;';
        }
    });

    videoPreview.addEventListener('timeupdate', function() {
        const endTime = (endSlider.value / 100) * videoPreview.duration;
        
        if (videoPreview.currentTime >= endTime) {
            videoPreview.pause();
            playPauseBtn.innerHTML = '&#9654;';
        }
        
        updateTimeDisplay();
    });

    let sliderUpdateTimeout;
    
    timeSlider.addEventListener('input', function() {
        const minDistance = (1 / videoPreview.duration) * 100;
        const startValue = parseFloat(timeSlider.value);
        const endValue = parseFloat(endSlider.value);

        if (endValue - startValue < minDistance) {
            timeSlider.value = endValue - minDistance;
            return;
        }

        clearTimeout(sliderUpdateTimeout);
        sliderUpdateTimeout = setTimeout(() => {
            const startTime = (timeSlider.value / 100) * videoPreview.duration;
            videoPreview.currentTime = startTime;
            
            if (!videoPreview.paused) {
                videoPreview.play();
            }
        }, 16);

        updateTimeDisplay();
    });

    endSlider.addEventListener('input', function() {
        const minDistance = (1 / videoPreview.duration) * 100;
        const startValue = parseFloat(timeSlider.value);
        const endValue = parseFloat(endSlider.value);

        if (endValue - startValue < minDistance) {
            endSlider.value = startValue + minDistance;
            return;
        }

        updateTimeDisplay();
    });

    cropOverlay.addEventListener('mousedown', initDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);

    cropPoints.forEach(point => {
        point.addEventListener('mousedown', initPointDrag);
    });

    function initDrag(e) {
        if (e.button !== 0) return;
        
        if (e.target === cropOverlay) {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = cropOverlay.offsetLeft;
            startTop = cropOverlay.offsetTop;
        }
    }

    function initPointDrag(e) {
        if (e.button !== 0) return;
        
        e.stopPropagation();
        isDragging = true;
        currentPoint = e.target;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = cropOverlay.offsetWidth;
        startHeight = cropOverlay.offsetHeight;
        startLeft = cropOverlay.offsetLeft;
        startTop = cropOverlay.offsetTop;
    }

    function drag(e) {
        if (!isDragging) return;

        const wrapperRect = cropOverlay.parentElement.getBoundingClientRect();
        const minSize = 50;
        
        if (currentPoint) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            const point = currentPoint.dataset.point;
            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;

            switch(point) {
                case 'top-left':
                    newLeft = Math.min(Math.max(0, startLeft + dx), startLeft + startWidth - minSize);
                    newTop = Math.min(Math.max(0, startTop + dy), startTop + startHeight - minSize);
                    newWidth = startLeft + startWidth - newLeft;
                    newHeight = startTop + startHeight - newTop;
                    break;
                case 'top-right':
                    newWidth = Math.min(Math.max(minSize, startWidth + dx), wrapperRect.width - startLeft);
                    newTop = Math.min(Math.max(0, startTop + dy), startTop + startHeight - minSize);
                    newHeight = startTop + startHeight - newTop;
                    break;
                case 'bottom-left':
                    newLeft = Math.min(Math.max(0, startLeft + dx), startLeft + startWidth - minSize);
                    newWidth = startLeft + startWidth - newLeft;
                    newHeight = Math.min(Math.max(minSize, startHeight + dy), wrapperRect.height - startTop);
                    break;
                case 'bottom-right':
                    newWidth = Math.min(Math.max(minSize, startWidth + dx), wrapperRect.width - startLeft);
                    newHeight = Math.min(Math.max(minSize, startHeight + dy), wrapperRect.height - startTop);
                    break;
            }

            if (newLeft + newWidth > wrapperRect.width) {
                newWidth = wrapperRect.width - newLeft;
            }
            if (newTop + newHeight > wrapperRect.height) {
                newHeight = wrapperRect.height - newTop;
            }

            newWidth = Math.max(minSize, newWidth);
            newHeight = Math.max(minSize, newHeight);

            cropOverlay.style.width = `${newWidth}px`;
            cropOverlay.style.height = `${newHeight}px`;
            cropOverlay.style.left = `${newLeft}px`;
            cropOverlay.style.top = `${newTop}px`;
        } else {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            let newLeft = startLeft + dx;
            let newTop = startTop + dy;

            newLeft = Math.max(0, Math.min(newLeft, wrapperRect.width - cropOverlay.offsetWidth));
            newTop = Math.max(0, Math.min(newTop, wrapperRect.height - cropOverlay.offsetHeight));

            cropOverlay.style.left = `${newLeft}px`;
            cropOverlay.style.top = `${newTop}px`;
        }
    }

    function stopDrag() {
        isDragging = false;
        currentPoint = null;
    }

    cropOverlay.addEventListener('touchstart', e => {
        e.preventDefault();
        const touch = e.touches[0];
        const event = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        initDrag(event);
    });

    document.addEventListener('touchmove', e => {
        if (isDragging) {
            e.preventDefault();
            const touch = e.touches[0];
            const event = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            drag(event);
        }
    });

    document.addEventListener('touchend', e => {
        if (isDragging) {
            e.preventDefault();
            stopDrag();
        }
    });

    document.addEventListener('mouseup', function(e) {
        if (isDragging) {
            stopDrag();
        }
    });

    window.addEventListener('blur', function() {
        if (isDragging) {
            stopDrag();
        }
    });

    window.addEventListener('beforeunload', () => {
        cleanupVideoUrl();
        cleanupFFmpeg();
    });

    downloadBtn.addEventListener('click', async function() {
        if (processedVideoBlob) {
            const url = URL.createObjectURL(processedVideoBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `edited_video.${selectedFormat}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 100);
            return;
        }

        downloadBtn.disabled = true;
        formatSelect.disabled = true;
        downloadBtn.textContent = 'Loading FFmpeg...';

        try {
            await initFFmpeg();
            
            if (!videoPreview.src) {
                alert('Please upload a video first');
                return;
            }

            downloadBtn.textContent = 'Processing...';

            const videoBlob = await fetch(videoPreview.src).then(r => r.blob());
            const { fetchFile } = FFmpeg;
            await ffmpeg.FS('writeFile', 'input.webm', await fetchFile(videoBlob));

            const videoRect = videoPreview.getBoundingClientRect();
            const cropRect = cropOverlay.getBoundingClientRect();
            
            const scaleX = videoPreview.videoWidth / videoRect.width;
            const scaleY = videoPreview.videoHeight / videoRect.height;
            
            const cropX = Math.round((cropRect.left - videoRect.left) * scaleX);
            const cropY = Math.round((cropRect.top - videoRect.top) * scaleY);
            const cropWidth = Math.round(cropRect.width * scaleX);
            const cropHeight = Math.round(cropRect.height * scaleY);

            const startTime = (timeSlider.value / 100) * videoPreview.duration;
            const endTime = (endSlider.value / 100) * videoPreview.duration;
            const duration = endTime - startTime;

            let outputFilename = 'output.' + selectedFormat;
            let ffmpegArgs = [
                '-i', 'input.webm',
                '-ss', startTime.toString(),
                '-t', duration.toString(),
                '-filter:v', `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}`
            ];

            switch(selectedFormat) {
                case 'mp4':
                    ffmpegArgs.push(
                        '-c:v', 'libx264',
                        '-preset', 'slow',
                        '-crf', '18',
                        '-profile:v', 'high',
                        '-level', '4.1',
                        '-movflags', '+faststart',
                        '-c:a', 'aac',
                        '-b:a', '192k'
                    );
                    break;
                case 'webm':
                    ffmpegArgs.push(
                        '-c:v', 'libvpx-vp9',
                        '-deadline', 'realtime',  
                        '-cpu-used', '4',        
                        '-crf', '30',
                        '-b:v', '0',             
                        '-row-mt', '1',
                        '-tile-columns', '2',    
                        '-threads', '4',         
                        '-c:a', 'libopus',
                        '-b:a', '128k'
                    );
                    break;
                case 'gif':
                    ffmpegArgs = [
                        '-i', 'input.webm',
                        '-ss', startTime.toString(),
                        '-t', duration.toString(),
                        '-filter:v',
                        `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY},` +
                        'fps=12,' + 
                        'scale=320:-1:flags=lanczos,' + 
                        'split[s0][s1];' +
                        '[s0]palettegen=max_colors=64:reserve_transparent=0:stats_mode=single[p];' +
                        '[s1][p]paletteuse=dither=floyd_steinberg:diff_mode=rectangle:new=1'
                    ];
                    ffmpegArgs.unshift('-loglevel', 'warning');
                    break;
            }

            ffmpegArgs.push(outputFilename);
            await ffmpeg.run(...ffmpegArgs);

            const data = ffmpeg.FS('readFile', outputFilename);
            const mimeTypes = {
                'mp4': 'video/mp4',
                'webm': 'video/webm',
                'gif': 'image/gif'
            };
            processedVideoBlob = new Blob([data.buffer], { type: mimeTypes[selectedFormat] });
            const url = URL.createObjectURL(processedVideoBlob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `edited_video.${selectedFormat}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => {
                URL.revokeObjectURL(url);
                try {
                    ffmpeg.FS('unlink', 'input.webm');
                    ffmpeg.FS('unlink', outputFilename);
                } catch (e) {
                    console.error('Cleanup error:', e);
                }
                cleanupFFmpeg();
            }, 100);

        } catch (error) {
            alert('Error processing video: ' + error.message);
            processedVideoBlob = null;
        } finally {
            downloadBtn.disabled = false;
            formatSelect.disabled = false;
            downloadBtn.textContent = 'Download Video';
        }
    });

    timeSlider.addEventListener('change', () => processedVideoBlob = null);
    endSlider.addEventListener('change', () => processedVideoBlob = null);
    cropOverlay.addEventListener('mouseup', () => processedVideoBlob = null);

    volumeSlider.addEventListener('input', function() {
        const volume = this.value / 100;
        videoPreview.volume = volume;
        updateVolumeIcon(volume);
    });

    volumeBtn.addEventListener('click', function() {
        if (videoPreview.volume > 0) {
            previousVolume = videoPreview.volume;
            videoPreview.volume = 0;
            volumeSlider.value = 0;
        } else {
            videoPreview.volume = previousVolume;
            volumeSlider.value = previousVolume * 100;
        }
        updateVolumeIcon(videoPreview.volume);
    });

    videoPreview.volume = volumeSlider.value / 100;
    updateVolumeIcon(videoPreview.volume);

    formatSelect.addEventListener('change', async function() {
        selectedFormat = this.value;
        processedVideoBlob = null;
    });
}

// Make startEditing function globally available
window.startEditing = async function() {
    document.getElementById('landing').classList.add('hidden');
    document.getElementById('editor').classList.add('active');
    initializeEditor(); // Initialize editor elements after they're visible
    document.getElementById('fileInput').click();
}; 