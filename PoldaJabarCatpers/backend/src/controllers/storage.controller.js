const { getSignedUploadUrl, uploadFileToSupabase } = require('../utils/supabaseStorage');

/**
 * Controller to get a pre-signed upload URL
 * Request body: { fileName, folderPath }
 */
const getUploadUrl = async (req, res) => {
    try {
        const { fileName, folderPath } = req.body;

        if (!fileName) {
            return res.status(400).json({ message: 'Target fileName wajib ada.' });
        }

        const data = await getSignedUploadUrl(fileName, folderPath || 'pelanggaran');
        res.status(200).json(data);
    } catch (error) {
        console.error('SERVER ERROR (getUploadUrl):', error);
        res.status(500).json({ message: 'Gagal membuat URL unggah aman.' });
    }
};

/**
 * Controller to handle file upload relayed through the server
 */
const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
        }

        const folderPath = req.body.folderPath || 'uploads';
        const publicUrl = await uploadFileToSupabase(req.file, folderPath);

        res.status(200).json({
            message: 'File berhasil diunggah.',
            publicUrl
        });
    } catch (error) {
        console.error('SERVER ERROR (uploadFile):', error);
        res.status(500).json({ message: 'Gagal mengunggah file ke penyimpanan storage.' });
    }
};

module.exports = {
    getUploadUrl,
    uploadFile
};
