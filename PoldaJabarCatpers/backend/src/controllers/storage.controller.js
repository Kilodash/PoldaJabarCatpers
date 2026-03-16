const { getSignedUploadUrl } = require('../utils/supabaseStorage');

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

module.exports = {
    getUploadUrl
};
