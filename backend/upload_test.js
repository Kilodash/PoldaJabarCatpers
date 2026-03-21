require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testUpload() {
    console.log("Starting upload test to 'catpers-lampiran'...");
    
    // Create a dummy text file buffer
    const buffer = Buffer.from('This is a test upload from the backend diagnostics script.', 'utf-8');
    
    const filePath = `test/test-file-${Date.now()}.txt`;
    
    try {
        const { data, error } = await supabase.storage
            .from('catpers-lampiran')
            .upload(filePath, buffer, {
                contentType: 'text/plain',
                upsert: false
            });
            
        if (error) {
            console.error("Supabase Storage Error:", error.message);
            console.error("Full Error Object:", error);
            process.exit(1);
        }
        
        console.log("Upload Success! Data:", data);
        process.exit(0);
    } catch (e) {
        console.error("Exception:", e);
        process.exit(1);
    }
}

testUpload();
