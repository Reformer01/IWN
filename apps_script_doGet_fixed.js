function doGet(e) {
  // Handle missing event object when testing in Apps Script editor
  e = e || {};
  
  // Add CORS handling for preflight requests
  if (e.parameter && e.parameter.callback) {
    return ContentService.createTextOutput(e.parameter.callback + '(' + JSON.stringify({error: 'JSONP not implemented'}) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  
  try {
    // Use your specific spreadsheet ID
    const ss = SpreadsheetApp.openById("1gbS2gt4rk7pltpZWJ9xVzTo9tva7r8wtBI76lecce4Y");
    
    const supportSheet = ss.getSheetByName("Support Quality Snapshot");
    const networkSheet = ss.getSheetByName("Network & Service Reliability");
    const spotlightSheet = ss.getSheetByName("The Spotlight & Social Proof");
    
    if (!supportSheet) throw new Error('Sheet "Support Quality Snapshot" not found');
    
    // ========== 1. SUPPORT DATA ANALYSIS ==========
    const sData = supportSheet.getDataRange().getValues();
    let sSum = 0, sCount = 0;
    let staffPerformance = {};

    for (let i = 1; i < sData.length; i++) {
      let score = parseFloat(sData[i][3]); // Column D - Overall Satisfaction
      let staff = sData[i][7] || "Unknown"; // Column H - Staff Name
      
      if (!isNaN(score)) {
        sSum += score;
        sCount++;
        
        if (!staffPerformance[staff]) {
          staffPerformance[staff] = {sum: 0, count: 0};
        }
        staffPerformance[staff].sum += score;
        staffPerformance[staff].count++;
      }
    }

    const staffArray = Object.keys(staffPerformance).map(name => ({
      name: name,
      score: parseFloat((staffPerformance[name].sum / staffPerformance[name].count).toFixed(1))
    }));

    // ========== 2. NETWORK DATA ANALYSIS ==========
    let networkStability = 0;
    if (networkSheet) {
      const nData = networkSheet.getDataRange().getValues();
      let nSum = 0, nCount = 0;
      
      for (let i = 1; i < nData.length; i++) {
        let stability = parseFloat(nData[i][2]); // Column C - Stability rating
        if (!isNaN(stability)) {
          nSum += stability;
          nCount++;
        }
      }
      networkStability = nCount > 0 ? parseFloat((nSum / nCount).toFixed(1)) : 0;
    }

    // ========== 3. TESTIMONIALS FROM BOTH SHEETS ==========
    let testimonials = [];
    
    // From Network & Service Reliability (Column F = feedback, Column B = email/name)
    if (networkSheet) {
      const nData = networkSheet.getDataRange().getValues();
      for (let i = 1; i < nData.length; i++) {
        let text = nData[i][5]; // Column F - "Kindly share an exceptional experience"
        let name = nData[i][1]; // Column B - Email/Name
        if (text && text.toString().trim()) {
          testimonials.push({
            name: name || "Anonymous",
            text: text.toString().trim(),
            source: "Network"
          });
        }
      }
    }
    
    // From The Spotlight & Social Proof (Column C = feedback, Column F = name)
    if (spotlightSheet) {
      const sData = spotlightSheet.getDataRange().getValues();
      for (let i = 1; i < sData.length; i++) {
        let text = sData[i][2]; // Column C - "Kindly share with us an exceptional experience"
        let name = sData[i][5]; // Column F - Name
        if (text && text.toString().trim()) {
          testimonials.push({
            name: name || "Anonymous",
            text: text.toString().trim(),
            source: "Spotlight"
          });
        }
      }
    }
    
    // Sort by most recent (assuming row order = chronological) and take last 5
    testimonials = testimonials.reverse().slice(0, 5);

    // ========== CONSTRUCT FINAL DATA ==========
    const analytics = {
      support: {
        avg: sCount > 0 ? parseFloat((sSum / sCount).toFixed(1)) : 0,
        total: sCount,
        staff: staffArray
      },
      network: { stability: networkStability },
      testimonials: testimonials.length > 0 ? testimonials : [{ text: 'No testimonials yet', name: 'System', source: '' }]
    };

    // Return JSON with CORS headers
    return ContentService.createTextOutput(JSON.stringify(analytics))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      error: error.message,
      support: { avg: 0, total: 0, staff: [] },
      network: { stability: 0 },
      testimonials: [{ text: 'Error: ' + error.message, name: 'System', source: '' }]
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}
