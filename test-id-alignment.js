const axios = require('axios');
const fs = require('fs');

async function testIDGeneration() {
  try {
    console.log('🧪 Testing ID template alignment...');
    
    const response = await axios.post('http://localhost:3001/api/generate-test-id', {
      fullName: 'Test User Name',
      birthDate: '1990-01-01',
      address: '123 Test Street, Barangay 73, Caloocan City',
      referenceNumber: 'TEST-001',
      sex: 'Male',
      civilStatus: 'Single'
    });
    
    console.log('✅ Test ID generated successfully!');
    console.log('📁 File saved to:', response.data.filePath);
    console.log('🌐 View at: http://localhost:3001' + response.data.filePath);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testIDGeneration();
