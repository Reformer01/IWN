/**
 * Daily revenue tracker — formulas against live pipeline, not hardcoded fake phones.
 */

function updateDailyTrackerMetrics() {
  bootstrapIfNeeded_();
  const ss = iwnSs_();
  const trackerSheet = iwnSheet_(IWN.SHEETS.TRACKER);
  const today = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd');

  trackerSheet.getRange('A1:D1').merge().setValue('I-WORLD NETWORKS — DAILY REVENUE & TRACKING REPORT')
    .setFontWeight('bold').setFontSize(13).setBackground('#1c4587').setFontColor('#ffffff')
    .setHorizontalAlignment('center');

  trackerSheet.getRange('A2:B2').merge().setValue('Date: ' + today).setFontWeight('bold');
  trackerSheet.getRange('C2:D2').merge().setValue('Submitted by: Reformer Ejembi').setFontWeight('bold');

  trackerSheet.getRange('A4:D4').setValues([['Metric', 'Target (NGN)', 'Actual Achieved (NGN)', 'Variance / % Met']])
    .setFontWeight('bold').setBackground('#d9ead3');

  trackerSheet.getRange('A5').setValue('Daily Revenue Target');
  trackerSheet.getRange('B5').setValue(1400000);
  if (!trackerSheet.getRange('C5').getValue()) trackerSheet.getRange('C5').setValue(0);
  trackerSheet.getRange('D5').setFormula('=C5-B5');

  trackerSheet.getRange('A6').setValue('Monthly Revenue Target (MTD)');
  trackerSheet.getRange('B6').setValue(42000000);
  if (!trackerSheet.getRange('C6').getValue()) trackerSheet.getRange('C6').setValue(0);
  trackerSheet.getRange('D6').setFormula('=C6-B6');

  trackerSheet.getRange('A7').setValue('Inbound Qualified Pipeline Leads');
  trackerSheet.getRange('B7').setValue(100);
  trackerSheet.getRange('C7').setFormula("=COUNTA('03 Sales Pipeline'!A2:A)");
  trackerSheet.getRange('D7').setFormula('=IF(B7=0,0,C7/B7)');

  trackerSheet.getRange('A8').setValue('Total Pipeline MRR Value');
  trackerSheet.getRange('B8').setValue(14000000);
  trackerSheet.getRange('C8').setFormula("=SUM('03 Sales Pipeline'!H2:H)");
  trackerSheet.getRange('D8').setFormula('=IF(B8=0,0,C8/B8)');

  trackerSheet.getRange('A9').setValue('Unique Leads Today (assignments)');
  trackerSheet.getRange('B9').setValue(Number(iwnSetting_('DAILY_QUOTA_PER_REP', 8)) * 4);
  trackerSheet.getRange('C9').setFormula("=COUNTIF('08 Rep Assignments Today'!A2:A,TODAY())");
  trackerSheet.getRange('D9').setFormula('=IF(B9=0,0,C9/B9)');

  trackerSheet.getRange('B5:C6').setNumberFormat('₦#,##0');
  trackerSheet.getRange('D5:D6').setNumberFormat('₦#,##0;[Red](₦#,##0)');
  trackerSheet.getRange('B8:C8').setNumberFormat('₦#,##0');
  trackerSheet.getRange('D7:D9').setNumberFormat('0.0%');

  trackerSheet.getRange('A11:D11').merge().setValue('DIGITAL, TECHNICAL & DESIGN ACHIEVEMENTS TODAY')
    .setFontWeight('bold').setBackground('#c9daf8');
  
  const taskData = [
    ['CUAB License Increase Escalation Follow-Up', 'Followed up on Crescent University Abeokuta (CUAB) Google Workspace license increase request to expedite activation and administrative approval.', 'COMPLETED', 'Reformer & Team'],
    ['Sales Team BTS MRR Platform Training', 'Conducted an interactive operational training session with sales staff on utilizing the CSAT platform to track and extract their BTS MRR performance data.', 'COMPLETED', 'Reformer & Sales Team'],
    ['CSAT Platform Feature Enhancements & Core Optimization', 'Developed and deployed core enhancements, stability updates, and usability improvements across the CSAT platform.', 'COMPLETED', 'Reformer'],
    ['Customer Complaint Frequency & Classification Architecture', 'Explored and scoped architectural frameworks within CSAT to categorize complaint types and analyze customer issue frequency trends.', 'IN PROGRESS', 'Reformer & Support Team'],
    ['New Customer Welcome Guide & Billing Documentation', 'Collaborated with the Billing & Accounts Department to structure and standardize the official welcome guide and onboarding documentation for new subscribers.', 'COMPLETED', 'Reformer & Billing']
  ];

  // Clear rows 12-30 to ensure clean overwrite
  trackerSheet.getRange('A12:D30').clearContent().clearFormat();
  trackerSheet.getRange('A12:D16').setValues(taskData);

  trackerSheet.getRange('A18:D18').merge().setValue('NEXT STEPS & IMMEDIATE ACTION ITEMS')
    .setFontWeight('bold').setBackground('#fce5cd');
  trackerSheet.getRange('A19:D19').setValues([['Action Item', 'Description / Objective', 'Target Completion', 'Owner / Assignee']])
    .setFontWeight('bold').setBackground('#fff2cc');
  trackerSheet.getRange('A20:D24').setValues([
    ['CSAT Complaint Analytics Module Implementation', 'Finalize data models and UI widgets to track complaint recurrence frequency and issue categorization in CSAT.', 'Tomorrow', 'Reformer & Support'],
    ['CUAB License Quota Activation Verification', 'Confirm final license increase provisioning on Google Admin Console for CUAB.', 'Friday', 'Reformer & Johnson'],
    ['New Customer Welcome Guide Rollout', 'Finalize digital distribution workflow and automated billing dispatch for the welcome guide.', 'Friday', 'Reformer & Billing'],
    ['Sales BTS MRR Data Utilization Monitoring', 'Monitor sales team daily adoption of the BTS MRR dashboard across all territories.', 'Ongoing', 'Reformer & Sales Reps'],
    ['Sales Pipeline Territory Outreach Cadence', 'Review rep activity cadence on newly assigned target enterprise accounts in 03 Sales Pipeline.', 'Daily', 'Reformer & Sales Reps']
  ]);
  trackerSheet.autoResizeColumns(1, 4);
  refreshSourceScoreboard();
}
