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
        // We now use the backend /storage/upload endpoint instead of direct signed URL
        // because signed URLs require service role keys which are often missing in dev.

        const formData = new FormData();
        formData.append('file', file);
        formData.append('folderPath', folderPath);

        const response = await api.post('/storage/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            },
            signal
        });

        return response.data.publicUrl;
    } catch (error) {
        if (axios.isCancel(error)) {
            console.log('Upload aborted');
            throw error;
        }
        console.error('Upload failed:', error);
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
