
const { format } = require('date-fns');

// Mock helpers
const formatTimeStr = (date) => format(date, 'HH:mm');

// Mock State
let logSessionModalConfig = {};
let events = [];
const tags = [{ id: 'tag1', label: 'Test Tag' }];

// Mock App functions
const setLogSessionModalConfig = (config) => {
    logSessionModalConfig = config;
    // console.log('LogSessionModal Config Updated:', config);
};

const handleAddEvent = (eventData) => {
    console.log('Event Created:', eventData);
    events.push(eventData);
};

// 1. Simulate Alarm Logic (handleFinishSession)
const simulateAlarmFinish = (startTimeOffsetMs, durationMs) => {
    console.log('--- Simulating Alarm Finish ---');
    // Mock "now" as a fixed date for deterministic testing
    // Let's say "now" is 2023-10-28 00:30:00 (Early morning)
    // And the session started 1 hour ago (2023-10-27 23:30:00) - Previous Day!
    
    const now = new Date('2023-10-28T00:30:00'); 
    const finalElapsed = 60 * 60 * 1000; // 1 hour

    const endTimeStr = formatTimeStr(now);
    const startTimeDate = new Date(now.getTime() - finalElapsed);
    const startTimeStr = formatTimeStr(startTimeDate);

    console.log(`Calculated Start: ${startTimeDate.toISOString()} (${startTimeStr})`);
    console.log(`Calculated End: ${now.toISOString()} (${endTimeStr})`);

    // Call "openLogSessionModal"
    // This simulates the fixed logic in Alarm.tsx
    setLogSessionModalConfig({ 
        isOpen: true, 
        startTime: startTimeStr, 
        endTime: endTimeStr, 
        startDate: startTimeDate, 
        endDate: now 
    });
};

// 2. Simulate App Logic (handleLogSession)
const simulateHandleLogSession = (description, tagIds) => {
    console.log('--- Simulating Handle Log Session ---');
    const { startTime, endTime, startDate } = logSessionModalConfig;
    
    if (!startTime || !endTime) {
        console.error('Missing time info');
        return;
    }

    // The logic we added to App.tsx
    const eventDate = startDate || new Date(); 

    if (tagIds.length === 0) {
        handleAddEvent({
            title: description.trim() || '计时活动',
            startTime,
            endTime,
            category: tags[0]?.id || '',
            date: eventDate
        });
    } else {
        tagIds.forEach(tagId => {
            const tag = tags.find(t => t.id === tagId);
            handleAddEvent({
                title: description.trim() || tag?.label || '计时活动',
                startTime,
                endTime,
                category: tagId,
                date: eventDate
            });
        });
    }
};

// --- Run Test ---

// Scenario: Cross-day event
simulateAlarmFinish();
simulateHandleLogSession('Cross Day Test', ['tag1']);

// Verification
const createdEvent = events[0];
if (createdEvent) {
    const expectedDateStr = '2023-10-27'; // Should be the start date
    const actualDateStr = format(createdEvent.date, 'yyyy-MM-dd');
    
    console.log('--- Verification ---');
    console.log(`Expected Date: ${expectedDateStr}`);
    console.log(`Actual Date:   ${actualDateStr}`);
    
    if (expectedDateStr === actualDateStr) {
        console.log('SUCCESS: Event date matches start date (handles cross-day correctly).');
    } else {
        console.log('FAILURE: Event date does not match start date.');
    }
} else {
    console.log('FAILURE: No event created.');
}
