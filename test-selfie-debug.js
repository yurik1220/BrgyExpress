// Debug script for selfie image positioning
const axios = require('axios');

const API_BASE = 'http://localhost:5000';

async function testSelfieDebug() {
  try {
    console.log('🔍 Testing selfie image positioning...\n');

    // Test with your existing selfie image
    console.log('1. Testing with existing selfie image...');
    const testResponse = await axios.post(`${API_BASE}/api/template/test`, {
      fullName: 'Debug Test User',
      birthDate: '1990-01-01',
      address: 'Test Address for Debug',
      referenceNumber: 'DEBUG-001',
      sex: 'Male',
      civilStatus: 'Single',
      selfieUrl: '/uploads/selfie.jpg'
    });

    if (testResponse.data.success) {
      console.log('✅ Template generation successful!');
      console.log('Preview URL:', testResponse.data.testUrl);
      console.log('Check the server logs above for selfie processing details');
    } else {
      console.log('❌ Template generation failed!');
    }

    // Test with different selfie positioning
    console.log('\n2. Testing with different selfie positioning...');
    
    // First, update the selfie position
    const configUpdateResponse = await axios.post(`${API_BASE}/api/template/config`, {
      config: {
        imagePositions: {
          selfie: {
            x: 50,    // Move left
            y: 150,   // Move up
            width: 300,  // Make bigger
            height: 300,
            borderRadius: 0
          }
        }
      }
    });
    
    console.log('Config update response:', configUpdateResponse.data.message);

    // Test again with new positioning
    const testResponse2 = await axios.post(`${API_BASE}/api/template/test`, {
      fullName: 'Positioned Test User',
      birthDate: '1990-01-01',
      address: 'Test Address for Positioning',
      referenceNumber: 'DEBUG-002',
      sex: 'Female',
      civilStatus: 'Married',
      selfieUrl: '/uploads/selfie.jpg'
    });

    if (testResponse2.data.success) {
      console.log('✅ Repositioned template generation successful!');
      console.log('Preview URL:', testResponse2.data.testUrl);
    } else {
      console.log('❌ Repositioned template generation failed!');
    }

    console.log('\n📝 Check the server console for detailed selfie processing logs');
    console.log('Look for messages like:');
    console.log('- "Processing selfie image: /uploads/selfie.jpg"');
    console.log('- "Selfie config: {...}"');
    console.log('- "Adding selfie layer at position: {...}"');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testSelfieDebug();


