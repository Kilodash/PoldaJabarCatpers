import api from './api';
import axios from 'axios';

/**
 * Handle direct upload to Supabase via pre-signed URL
 * @param {File} file - File object from input
 * @param {String} folderPath - Target folder
 * @param {Function} onProgress - Callback for upload progress (0-100)
 * @param {AbortSignal} signal - Signal for aborting request
 * @returns {Promise<String>} - The public URL of the uploaded file
 */
export const uploadFileDirectly = async (file, folderPath = 'pelanggaran', onProgress = () => { }, signal = null) => {
    try {
        // 1. Get Pre-signed URL from backend
        const { data: signData } = await api.post('/storage/upload-url', {
            fileName: file.name,
            folderPath
        }, { signal });

        const { signedUrl, publicUrl } = signData;

        // 2. Upload directly to Supabase
        // Note: createSignedUploadUrl expects a standard PUT request
        // https://supabase.com/docs/guides/storage/uploads/direct-uploads#signed-upload-urls

        await axios.put(signedUrl, file, {
            headers: {
                'Content-Type': file.type,
                // 'x-upsert': 'false' // Default is false
            },
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            },
            signal
        });

        return publicUrl;
    } catch (error) {
        if (axios.isCancel(error)) {
            console.log('Upload direct aborted');
            throw error;
        }
        console.error('Direct upload failed:', error);
        const status = error.response?.status;
        const msg = error.response?.data?.message || error.message;
        throw new Error(`Upload gagal (Status: ${status || 'Unknown'}). Detail: ${msg}`);
    }
};

/**
 * Upload multiple files sequentially or in parallel
 */
export const uploadMultipleFilesDirectly = async (files, folderPath = 'pelanggaran', onTotalProgress = () => { }, signal = null) => {
    if (!files || files.length === 0) return null;

    const fileArray = Array.from(files);
    const progressMap = new Map();
    const urls = [];

    const handleProgress = (index, progress) => {
        progressMap.set(index, progress);
        const totalProgress = Array.from(progressMap.values()).reduce((a, b) => a + b, 0) / fileArray.length;
        onTotalProgress(Math.round(totalProgress));
    };

    const uploadPromises = fileArray.map(async (file, index) => {
        const url = await uploadFileDirectly(file, folderPath, (p) => handleProgress(index, p), signal);
        urls.push(url);
    });

    await Promise.all(uploadPromises);
    return urls.join(',');
};
