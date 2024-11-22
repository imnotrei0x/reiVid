document.addEventListener('DOMContentLoaded', async () => {
    // Initialize FFmpeg right away
            await initFFmpeg();
            
    // Show file input prompt automatically
    document.getElementById('fileInput').click();
    
    // Rest of the editor.js code, but remove all the pendingVideo/videoStore related code
    // Just keep the file input handler and other editor functionality
}); 