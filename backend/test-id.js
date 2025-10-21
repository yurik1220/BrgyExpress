const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function testIDGeneration() {
  try {
    console.log('🧪 Testing ID template alignment...');
    
    // Test data
    const testData = {
      id: 'TEST-001',
      fullName: 'Test User Name',
      birthDate: '1990-01-01',
      address: '123 Test Street, Barangay 73, Caloocan City',
      referenceNumber: 'TEST-001',
      sex: 'Male',
      civilStatus: 'Single',
      selfieUrl: '/uploads/selfie.jpg'
    };
    
    // Call the generateIdCardImage function directly
    const { generateIdCardImage } = require('./server.js');
    
    const result = await generateIdCardImage(testData);
    
    if (result) {
      console.log('✅ Test ID generated successfully!');
      console.log('📁 File path:', result);
      console.log('🌐 View at: http://localhost:3001' + result);
    } else {
      console.log('❌ Failed to generate ID');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testIDGeneration();
