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
    ['Engine Room Strategy Meeting (CSAT & Splynx)', 'Attended Engine room meeting to deliver updates on the CSAT app and align on methods to improve data accuracy on Splynx.', 'COMPLETED', 'Reformer'],
    ['Customer Call & Interaction Logging', 'Added a dedicated feature enabling support staff to log calls, inquiries, and interactions with customers seamlessly.', 'COMPLETED', 'Reformer'],
    ['Territory Sales Lead Distribution', 'Curated and distributed fresh targeted enterprise accounts to territory sales representatives across Southwest regions.', 'COMPLETED', 'Reformer'],
    ['CSAT Mailing Suite & UI Designs', 'Engineered CSAT platform automated mailing capabilities and upgraded layout design templates.', 'COMPLETED', 'Reformer']
  ];

  trackerSheet.getRange('A12:D15').setValues(taskData);

  trackerSheet.getRange('A17:D17').merge().setValue('NEXT STEPS & IMMEDIATE ACTION ITEMS')
    .setFontWeight('bold').setBackground('#fce5cd');
  trackerSheet.getRange('A18:D18').setValues([['Action Item', 'Description / Objective', 'Target Completion', 'Owner / Assignee']])
    .setFontWeight('bold').setBackground('#fff2cc');
  trackerSheet.getRange('A19:D23').setValues([
    ['Support Staff Call Log Adoption', 'Monitor customer support team adoption of the new call and interaction logging workflow.', 'Tomorrow', 'Reformer & Support Team'],
    ['Splynx Data Accuracy Optimization', 'Implement discussed data hygiene parameters and sync optimizations on Splynx.', 'Next Week', 'Reformer & Engineering'],
    ['CSAT Automated Trigger Validation', 'Perform live end-to-end testing on updated CSAT mail templates and automated triggers.', 'Monday', 'Reformer'],
    ['Sales Pipeline Outreach Oversight', 'Review territory sales reps engagement and follow-up on newly distributed target accounts.', 'Daily', 'Reformer & Sales Reps'],
    ['Regional Coverage Prioritization', 'Align new account prospecting with active metro fiber POPs across Ogun, Osun, Ondo, and Oyo.', 'Ongoing', 'Reformer']
  ]);
  trackerSheet.autoResizeColumns(1, 4);
  refreshSourceScoreboard();
}
