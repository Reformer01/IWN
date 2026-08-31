/**
 * IWN — Daily Activity Logger
 * Logs today's completed tasks to the "10 Daily Activity Log" sheet.
 * Run logTodaysTasks() to append the day's work.
 */

function logTodaysTasks() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const SHEET_NAME = '10 Daily Activity Log';

  // Create sheet if it doesn't exist
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange('A1:F1').setValues([['Date', 'Category', 'Task', 'Status', 'Notes', 'Logged By']]);
    sheet.getRange('A1:F1').setFontWeight('bold').setBackground('#1c4587').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 110);
    sheet.setColumnWidth(2, 160);
    sheet.setColumnWidth(3, 380);
    sheet.setColumnWidth(4, 90);
    sheet.setColumnWidth(5, 260);
    sheet.setColumnWidth(6, 140);
  }

  const date = new Date('2026-08-31');
  const by   = 'Reformer Ejembi';

  const tasks = [
    [date, 'Customer Success',   'Uploaded updated BTS customer information to CSAT platform (provided by Technical & Support teams)', 'Done', '', by],
    [date, 'Product / CKA',      'Meeting with CKA team, CMO team & Johnson — discussed exam proctoring improvements and future roadmap', 'Done', 'Proposed Chromebooks + Chrome-native tools', by],
    [date, 'Product / CKA',      'Discussed improvements to Chrome extension and planned web application development', 'Done', 'Co-dev to start with Johnson', by],
    [date, 'Product / CKA',      'Started drafting web application architecture to share with Johnson for co-development', 'In Progress', '', by],
    [date, 'Operations / CMO',   'Meeting with CMOs on generating Google Admin Console usage reports for monthly reporting', 'Done', 'Walked through data extraction workflow', by],
    [date, 'Lead Engine',        'Sent daily leads to the sales team', 'Done', 'Lagos exclusion fix deployed', by],
    [date, 'Lead Engine',        'Continued improving lead generation and territory routing mechanism', 'Done', 'Routing.gs, Pipeline.gs, GooglePlacesAdapter.gs updated', by],
    [date, 'Customer Engagement','Sent feedback requests to current customers via the platform', 'Done', '', by],
    [date, 'Customer Engagement','Sent invoice reminders to relevant accounts', 'Done', '', by],
    [date, 'Operations',         'Routine website health check', 'Done', 'No issues found', by],
    [date, 'Operations',         'Routine social media monitoring', 'Done', '', by],
  ];

  sheet.getRange(sheet.getLastRow() + 1, 1, tasks.length, 6).setValues(tasks);

  // Alternate row shading for readability
  const startRow = sheet.getLastRow() - tasks.length + 1;
  tasks.forEach(function(_, i) {
    const row = startRow + i;
    const bg  = i % 2 === 0 ? '#f3f8ff' : '#ffffff';
    sheet.getRange(row, 1, 1, 6).setBackground(bg);
  });

  // Format date column
  sheet.getRange(startRow, 1, tasks.length, 1)
    .setNumberFormat('dd/mm/yyyy');

  SpreadsheetApp.getUi().alert(
    '✅ Daily Log Updated',
    tasks.length + ' tasks logged to "' + SHEET_NAME + '" for 31 Aug 2026.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
