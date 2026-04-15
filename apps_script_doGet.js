function doGet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Use the EXACT sheet names from your spreadsheet
    const supportSheet = ss.getSheetByName("Support Quality Snapshot");
    const networkSheet = ss.getSheetByName("Network & Service Reliability");
    const spotlightSheet = ss.getSheetByName("The Spotlight & Social Proof");
    
    // Check if sheets exist
    if (!supportSheet) throw new Error('Sheet "Support Quality Snapshot" not found');
    
    // ========== 1. ANALYZE SUPPORT DATA ==========
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

    // Build staff array with averages
    const staffArray = Object.keys(staffPerformance).map(name => ({
      name: name,
      score: parseFloat((staffPerformance[name].sum / staffPerformance[name].count).toFixed(1))
    }));

    // ========== 2. ANALYZE NETWORK DATA ==========
    let networkStability = 0;
    if (networkSheet) {
      const nData = networkSheet.getDataRange().getValues();
      let nSum = 0, nCount = 0;
      
      for (let i = 1; i < nData.length; i++) {
        let stability = parseFloat(nData[i][1]); // Column B - Stability Rating
        if (!isNaN(stability)) {
          nSum += stability;
          nCount++;
        }
      }
      
      networkStability = nCount > 0 ? parseFloat((nSum / nCount).toFixed(1)) : 0;
    }

    // ========== 3. CAPTURE TESTIMONIALS ==========
    let testimonials = [];
    if (spotlightSheet) {
      const tData = spotlightSheet.getDataRange().getValues();
      testimonials = tData.slice(1).reverse().slice(0, 3).map(row => ({
        name: row[4] || "Anonymous", // Column E
        text: row[1] || "" // Column B
      })).filter(t => t.text); // Only include if text exists
    }

    // ========== CONSTRUCT FINAL DATA ==========
    const analytics = {
      support: {
        avg: sCount > 0 ? parseFloat((sSum / sCount).toFixed(1)) : 0,
        total: sCount,
        staff: staffArray
      },
      network: {
        stability: networkStability
      },
      testimonials: testimonials.length > 0 ? testimonials : [
        { text: 'No testimonials yet', name: 'System' }
      ]
    };

    // Return with CORS headers for web access
    return ContentService.createTextOutput(JSON.stringify(analytics))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET'
      });
      
  } catch (error) {
    // Return error with proper CORS headers so frontend can display it
    return ContentService.createTextOutput(JSON.stringify({
      error: error.message,
      support: { avg: 0, total: 0, staff: [] },
      network: { stability: 0 },
      testimonials: [{ text: 'Error loading data: ' + error.message, name: 'System' }]
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET'
    });
  }
}
