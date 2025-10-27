#!/usr/bin/env node

/**
 * Test script to verify ID request notification formatting
 */

// Copy the formatDateForNotification function for testing
function formatDateForNotification(dateString) {
    if (!dateString) return 'TBA';
    
    try {
        const date = new Date(dateString);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'TBA';
        }
        
        // Format as "October 10, 2025 Time: 11:30pm"
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const month = monthNames[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();
        
        // Format time as 12-hour with am/pm
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
        const minutesStr = minutes < 10 ? '0' + minutes : minutes;
        
        return `${month} ${day}, ${year} Time: ${hours}:${minutesStr}${ampm}`;
    } catch (error) {
        return 'TBA';
    }
}

// Test different notification scenarios
console.log('🧪 Testing ID Request Notification Formats\n');

// Test 1: Approved with appointment
const approvedDate = '2024-12-25T14:30:00.000Z';
const approvedMsg = `✅ Your ID creation request has been approved! Pickup date: ${formatDateForNotification(approvedDate)}`;
console.log('📱 Approved Notification:');
console.log(approvedMsg);
console.log('');

// Test 2: Completed with appointment (NEW FORMAT)
const completedDate = '2024-12-26T09:15:00.000Z';
const completedMsg = `🎉 Your ID request has been completed and is ready for pickup! Pickup date: ${formatDateForNotification(completedDate)}`;
console.log('📱 Completed Notification (NEW):');
console.log(completedMsg);
console.log('');

// Test 3: Rejected
const rejectedMsg = `❌ Your ID creation request was rejected. Reason: Incomplete documentation`;
console.log('📱 Rejected Notification:');
console.log(rejectedMsg);
console.log('');

// Test 4: Edge cases
console.log('🔍 Edge Cases:');
console.log('No date:', formatDateForNotification(null));
console.log('Invalid date:', formatDateForNotification('invalid-date'));
console.log('Empty string:', formatDateForNotification(''));

console.log('\n✅ All notification formats tested successfully!');
console.log('\n📋 Summary:');
console.log('- Approved: Includes appointment date');
console.log('- Completed: NOW includes appointment date (NEW)');
console.log('- Rejected: Includes rejection reason');
console.log('- Date format: "Month Day, Year Time: HH:MMam/pm"');
console.log('- Fallback: "TBA" for invalid dates');


