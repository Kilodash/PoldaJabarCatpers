const { createClient } = require('@supabase/supabase-js');

// Initialize the Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase;

if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
}

const BUCKET_NAME = 'catpers-lampiran';

/**
 * Upload a file buffer to Supabase Storage
 * @param {Object} file - The file object from multer (req.file)
 * @param {String} folderPath - Target folder in bucket (e.g. 'pelanggaran', 'personel')
 * @returns {Promise<String>} - Public URL of the uploaded file
 */
const uploadFileToSupabase = async (file, folderPath = 'uploads') => {
    if (!supabase) {
        throw new Error('Supabase client is not initialized. Check your environment variables.');
    }

    if (!file) throw new Error('No file provided');

    // Generate a unique filename
    const uniqueFileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `${folderPath}/${uniqueFileName}`;

    try {
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) {
            console.error('Supabase upload error details:', error);
            throw error;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error('Error uploading to Supabase Storage:', error);
        throw error;
    }
};

/**
 * Delete a file from Supabase Storage using its public URL
 * @param {String} fileUrl - The full public URL of the file to delete
 */
const deleteFileFromSupabase = async (fileUrl) => {
    if (!supabase || !fileUrl) return;

    try {
        // Extract the file path from the public URL
        // Example URL: https://xyz.supabase.co/storage/v1/object/public/catpers-lampiran/pelanggaran/123-file.pdf
        const urlObj = new URL(fileUrl);
        const pathParts = urlObj.pathname.split(`/${BUCKET_NAME}/`);
        
        if (pathParts.length > 1) {
            const filePath = pathParts[1];
            const { error } = await supabase.storage
                .from(BUCKET_NAME)
                .remove([filePath]);
                
            if (error) console.error('Failed to delete file from Supabase:', error);
        }
    } catch (error) {
        console.error('Error parsing file URL for deletion:', error);
    }
};

module.exports = {
    supabase,
    uploadFileToSupabase,
    deleteFileFromSupabase
};
