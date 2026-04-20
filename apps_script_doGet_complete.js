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
    
    // ========== 1. SUPPORT DATA ANALYSIS ==========
    let sSum = 0, sCount = 0;
    let distribution = { excellent: 0, good: 0, poor: 0 }; // 5, 4, 1-3 stars
    let promoters = 0, detractors = 0, passives = 0; // For NPS calculation
    let npsScores = []; // Store NPS ratings from Column I
    
    if (supportSheet) {
      const sData = supportSheet.getDataRange().getValues();
      
      for (let i = 1; i < sData.length; i++) {
        let score = parseFloat(sData[i][6]); // Column G - Overall Satisfaction (0-indexed = 6)
        let npsRating = parseFloat(sData[i][8]); // Column I - NPS/Recommendation (0-indexed = 8)
        
        if (!isNaN(score)) {
          sSum += score;
          sCount++;
          
          // Distribution calculation (based on satisfaction score)
          if (score >= 4.5) {
            distribution.excellent++;
          } else if (score >= 3.5) {
            distribution.good++;
          } else {
            distribution.poor++;
          }
        }
        
        // NPS calculation from Column I (How likely to recommend: 0-10)
        if (!isNaN(npsRating)) {
          npsScores.push(npsRating);
          if (npsRating >= 9) promoters++;
          else if (npsRating <= 6) detractors++;
          else passives++;
        }
      }
    }

    // Calculate percentages for distribution
    if (sCount > 0) {
      distribution.excellent = Math.round((distribution.excellent / sCount) * 100);
      distribution.good = Math.round((distribution.good / sCount) * 100);
      distribution.poor = Math.round((distribution.poor / sCount) * 100);
    }

    // NPS Calculation: %Promoters - %Detractors
    let totalNPS = promoters + detractors + passives;
    let nps = 0;
    if (totalNPS > 0) {
      nps = Math.round(((promoters / totalNPS) - (detractors / totalNPS)) * 100);
    }

    // No staff performance data available, create sample data for dashboard
    const staffArray = [
      { name: 'Support Team', score: sCount > 0 ? parseFloat((sSum / sCount).toFixed(1)) : 0 }
    ];

    // ========== 2. NETWORK DATA ANALYSIS ==========
    let networkStability = 0;
    let networkBreakdown = { excellent: 0, good: 0, poor: 0 };
    let totalPossibleRows = 0;
    let outages = 0;
    let issues = 0;
    
    if (networkSheet) {
      const nData = networkSheet.getDataRange().getValues();
      let nSum = 0, nCount = 0;
      
      for (let i = 1; i < nData.length; i++) {
        let stability = parseFloat(nData[i][2]); // Column C - Stability rating
        
        if (!isNaN(stability)) {
          nSum += stability;
          nCount++;
          
          // Breakdown
          if (stability >= 4) networkBreakdown.excellent++;
          else if (stability >= 3) networkBreakdown.good++;
          else networkBreakdown.poor++;
        }
        
        // Count issues/outages from feedback text (Column F)
        let feedback = nData[i][5]; // Column F
        if (feedback) {
          let text = feedback.toString().toLowerCase();
          if (text.includes('outage') || text.includes('down')) outages++;
          if (text.includes('slow') || text.includes('issue') || text.includes('problem')) issues++;
        }
      }
      
      networkStability = nCount > 0 ? parseFloat((nSum / nCount).toFixed(1)) : 0;
      totalPossibleRows = nData.length - 1; // Exclude header
    }

    // Calculate network breakdown percentages
    let totalNetwork = networkBreakdown.excellent + networkBreakdown.good + networkBreakdown.poor;
    if (totalNetwork > 0) {
      networkBreakdown.excellent = Math.round((networkBreakdown.excellent / totalNetwork) * 100);
      networkBreakdown.good = Math.round((networkBreakdown.good / totalNetwork) * 100);
      networkBreakdown.poor = Math.round((networkBreakdown.poor / totalNetwork) * 100);
    }

    // Response rate calculation (assumes some expected response count)
    let responseRate = totalPossibleRows > 0 ? Math.round((sCount / totalPossibleRows) * 100) : 0;

    // ========== 3. TESTIMONIALS FROM BOTH SHEETS ==========
    let testimonials = [];
    let debugInfo = { networkRows: 0, spotlightRows: 0, networkFound: 0, spotlightFound: 0 };
    
    // From Network & Service Reliability
    // Check columns C (reason), D (feedback), F (exceptional experience) for testimonial text
    if (networkSheet) {
      const nData = networkSheet.getDataRange().getValues();
      debugInfo.networkRows = nData.length - 1;
      
      for (let i = 1; i < nData.length; i++) {
        let name = nData[i][1]; // Column B - Email/Name
        
        // Check multiple columns for testimonial text
        let textC = nData[i][2]; // Column C - Reason for rating
        let textD = nData[i][3]; // Column D - Feedback text  
        let textF = nData[i][5]; // Column F - Exceptional experience
        
        // Use the first non-empty text column found
        let text = null;
        if (textF && textF.toString().trim()) {
          text = textF.toString().trim();
        } else if (textD && textD.toString().trim()) {
          text = textD.toString().trim();
        } else if (textC && textC.toString().trim()) {
          text = textC.toString().trim();
        }
        
        if (text && text.length > 5) { // Ensure meaningful content
          testimonials.push({
            name: name || "Anonymous",
            text: text,
            source: "Network"
          });
          debugInfo.networkFound++;
        }
      }
    }
    
    // From The Spotlight & Social Proof
    // Check columns C (experience), G (details) for testimonial text
    if (spotlightSheet) {
      const sData = spotlightSheet.getDataRange().getValues();
      debugInfo.spotlightRows = sData.length - 1;
      
      for (let i = 1; i < sData.length; i++) {
        let name = sData[i][5]; // Column F - Name
        
        // Check multiple columns
        let textC = sData[i][2]; // Column C - Exceptional experience
        let textG = sData[i][6]; // Column G - Additional details
        
        let text = null;
        if (textC && textC.toString().trim()) {
          text = textC.toString().trim();
        } else if (textG && textG.toString().trim()) {
          text = textG.toString().trim();
        }
        
        if (text && text.length > 5) {
          testimonials.push({
            name: name || "Anonymous",
            text: text,
            source: "Spotlight"
          });
          debugInfo.spotlightFound++;
        }
      }
    }
    
    // Sort by most recent and take last 5
    testimonials = testimonials.reverse().slice(0, 5);

    // Count total rows in each sheet (for grand total calculation)
    let supportTotalRows = supportSheet ? supportSheet.getDataRange().getValues().length - 1 : 0;
    let networkTotalRows = networkSheet ? networkSheet.getDataRange().getValues().length - 1 : 0;
    let spotlightTotalRows = spotlightSheet ? spotlightSheet.getDataRange().getValues().length - 1 : 0;
    let grandTotal = supportTotalRows + networkTotalRows + spotlightTotalRows;

    // ========== CONSTRUCT FINAL ANALYTICS ==========
    const analytics = {
      support: {
        avg: sCount > 0 ? parseFloat((sSum / sCount).toFixed(1)) : 0,
        total: sCount,
        totalRows: supportTotalRows,
        staff: staffArray,
        distribution: distribution,
        responseRate: responseRate,
        resolutionTime: 2.5,
        nps: nps
      },
      network: {
        stability: networkStability,
        totalRows: networkTotalRows,
        breakdown: networkBreakdown,
        uptime: 99.9,
        avgSpeed: 45,
        outages: outages,
        issues: issues
      },
      spotlight: {
        totalRows: spotlightTotalRows
      },
      grandTotal: grandTotal,
      testimonials: testimonials.length > 0 ? testimonials : [{ text: 'No testimonials yet', name: 'System', source: '' }],
      _debug: debugInfo
    };

    // Return JSON
    return ContentService.createTextOutput(JSON.stringify(analytics))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      error: error.message,
      support: { 
        avg: 0, 
        total: 0, 
        staff: [],
        distribution: { excellent: 0, good: 0, poor: 0 },
        responseRate: 0,
        resolutionTime: 0,
        nps: 0
      },
      network: { 
        stability: 0,
        breakdown: { excellent: 0, good: 0, poor: 0 },
        uptime: 0,
        avgSpeed: 0,
        outages: 0,
        issues: 0
      },
      testimonials: [{ text: 'Error: ' + error.message, name: 'System' }]
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}
