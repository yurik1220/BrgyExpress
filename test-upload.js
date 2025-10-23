// Test script for image upload functionality
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:5000';

async function testImageUpload() {
  try {
    console.log('📤 Testing image upload functionality...\n');

    // Check if we have a test image
    const testImagePath = path.join(__dirname, 'backend', 'public', 'uploads', 'selfie.jpg');
    
    if (!fs.existsSync(testImagePath)) {
      console.log('❌ No test image found at:', testImagePath);
      console.log('Please add an image to backend/public/uploads/selfie.jpg');
      return;
    }

    console.log('✅ Found test image:', testImagePath);

    // Test upload
    const formData = new FormData();
    formData.append('image', fs.createReadStream(testImagePath));

    console.log('📤 Uploading image...');
    const uploadResponse = await axios.post(`${API_BASE}/api/upload-image`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    if (uploadResponse.data.success) {
      console.log('✅ Upload successful!');
      console.log('Image URL:', uploadResponse.data.url);
      
      // Test the uploaded image in template generation
      console.log('\n🖼️ Testing uploaded image in template...');
      const testResponse = await axios.post(`${API_BASE}/api/template/test`, {
        fullName: 'Test User with Uploaded Selfie',
        birthDate: '1990-01-01',
        address: 'Test Address',
        referenceNumber: 'TEST-UPLOAD-001',
        sex: 'Male',
        civilStatus: 'Single',
        selfieUrl: uploadResponse.data.url
      });

      if (testResponse.data.success) {
        console.log('✅ Template generation with uploaded image successful!');
        console.log('Preview URL:', testResponse.data.testUrl);
      } else {
        console.log('❌ Template generation failed!');
      }
    } else {
      console.log('❌ Upload failed:', uploadResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testImageUpload();


