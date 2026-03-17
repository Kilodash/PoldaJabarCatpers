require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000/api';
// We need a valid token to test since the route has authMiddleware
// For discovery, we'll try to find a user or just mock the request if possible.
// But since we want to test the full flow, let's see if we can get a token.

async function testRelayUpload() {
    console.log("Testing Backend Relay Upload...");
    
    // 1. Create a dummy file
    const testFilePath = path.join(__dirname, 'test_upload.txt');
    fs.writeFileSync(testFilePath, 'Hello from relay test ' + Date.now());
    
    try {
        // Normally we'd need a login here. 
        // For the sake of this test, we assume the server is running and we might need to bypass auth 
        // OR we can test the utility function directly.
        
        const { uploadFileToSupabase } = require('./src/utils/supabaseStorage');
        const fileMock = {
            originalname: 'test_relay.txt',
            buffer: fs.readFileSync(testFilePath),
            mimetype: 'text/plain'
        };
        
        console.log("Calling uploadFileToSupabase directly...");
        const url = await uploadFileToSupabase(fileMock, 'test-relay');
        console.log("Upload Success! Public URL:", url);
        
    } catch (error) {
        console.error("Test Failed:", error.message);
        if (error.response) {
            console.error("Response Data:", error.response.data);
        }
    } finally {
        if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    }
}

testRelayUpload();
