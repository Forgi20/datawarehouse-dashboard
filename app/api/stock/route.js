import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { NextResponse } from 'next/server';

// LCG Pseudo-Random Number Generator for model seed consistency
let lcgSeed = 42;
function seededRandom() {
  const x = Math.sin(lcgSeed++) * 10000;
  return x - Math.floor(x);
}

// 1. Support Vector Regression (SVR with RBF Kernel approximation)
function fitSVR(X, Y, X_pred) {
  const M = X.length;
  const gamma = 0.08;
  const lambda = 0.05; // regularisation

  // Build Kernel Matrix
  const K = Array(M).fill(0).map(() => Array(M).fill(0));
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < M; j++) {
      K[i][j] = Math.exp(-gamma * Math.pow(X[i] - X[j], 2));
    }
  }

  // Regularize diagonal
  for (let i = 0; i < M; i++) {
    K[i][i] += lambda;
  }

  // Solve system (K + lambda*I) * alpha = Y
  const alpha = solveLinearSystem(K, Y);

  // Predict on targets
  return X_pred.map(x => {
    let sum = 0;
    for (let i = 0; i < M; i++) {
      sum += alpha[i] * Math.exp(-gamma * Math.pow(X[i] - x, 2));
    }
    return sum;
  });
}

// Helper: Solve A * x = B via Gaussian Elimination
function solveLinearSystem(A, B) {
  const n = B.length;
  const M = A.map((row, i) => [...row, B[i]]);

  for (let i = 0; i < n; i++) {
    let maxEl = Math.abs(M[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > maxEl) {
        maxEl = Math.abs(M[k][i]);
        maxRow = k;
      }
    }

    const temp = M[maxRow];
    M[maxRow] = M[i];
    M[i] = temp;

    for (let k = i + 1; k < n; k++) {
      const c = -M[k][i] / M[i][i];
      for (let j = i; j < n + 1; j++) {
        if (i === j) {
          M[k][j] = 0;
        } else {
          M[k][j] += c * M[i][j];
        }
      }
    }
  }

  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n] / M[i][i];
    for (let k = i - 1; k >= 0; k--) {
      M[k][n] -= M[k][i] * x[i];
    }
  }
  return x;
}

// 2. Neural Network Regressor (MLP with Sigmoid activation)
function fitMLP(X, Y, X_pred) {
  lcgSeed = 100; // Reset seed
  const M = X.length;
  
  // Normalize parameters
  const xMin = Math.min(...X);
  const xMax = Math.max(...X);
  const yMin = Math.min(...Y);
  const yMax = Math.max(...Y);

  const normX = X.map(x => (x - xMin) / (xMax - xMin || 1));
  const normY = Y.map(y => (y - yMin) / (yMax - yMin || 1));

  // W1 is 1x5, b1 is 5
  // W2 is 5x1, b2 is 1
  let W1 = Array(5).fill(0).map(() => seededRandom() * 2 - 1);
  let b1 = Array(5).fill(0).map(() => seededRandom() * 2 - 1);
  let W2 = Array(5).fill(0).map(() => seededRandom() * 2 - 1);
  let b2 = seededRandom() * 2 - 1;

  const lr = 0.08;
  const epochs = 150;

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (let i = 0; i < M; i++) {
      const xi = normX[i];
      const yi = normY[i];

      // Forward
      const h_in = b1.map((b, j) => xi * W1[j] + b);
      const h_out = h_in.map(val => 1 / (1 + Math.exp(-val)));
      const y_out = W2.reduce((sum, w, j) => sum + h_out[j] * w, 0) + b2;

      // Backward
      const d_out = y_out - yi;
      const d_hidden = h_out.map((ho, j) => d_out * W2[j] * ho * (1 - ho));

      // Weight adjustment
      b2 -= lr * d_out;
      for (let j = 0; j < 5; j++) {
        W2[j] -= lr * d_out * h_out[j];
        b1[j] -= lr * d_hidden[j];
        W1[j] -= lr * d_hidden[j] * xi;
      }
    }
  }

  return X_pred.map(x => {
    const xi = (x - xMin) / (xMax - xMin || 1);
    const h_in = b1.map((b, j) => xi * W1[j] + b);
    const h_out = h_in.map(val => 1 / (1 + Math.exp(-val)));
    const y_out = W2.reduce((sum, w, j) => sum + h_out[j] * w, 0) + b2;
    return y_out * (yMax - yMin) + yMin;
  });
}

// 3. XGBoost (Ensemble of Decision Stumps approximation)
function fitXGBoost(X, Y, X_pred) {
  const M = X.length;
  const meanY = Y.reduce((s, y) => s + y, 0) / M;
  let F = Array(M).fill(meanY);

  const trees = [];
  const learningRate = 0.25;
  const numTrees = 5;

  for (let t = 0; t < numTrees; t++) {
    const residuals = Y.map((y, i) => y - F[i]);

    let bestSplit = 0;
    let bestFeatureVal = 0;
    let bestMSE = Infinity;
    let leftVal = 0;
    let rightVal = 0;

    for (let s = 0; s < M; s++) {
      const splitVal = X[s];
      const leftIndices = [];
      const rightIndices = [];
      for (let i = 0; i < M; i++) {
        if (X[i] <= splitVal) leftIndices.push(i);
        else rightIndices.push(i);
      }

      if (leftIndices.length === 0 || rightIndices.length === 0) continue;

      const meanLeft = leftIndices.reduce((sum, idx) => sum + residuals[idx], 0) / leftIndices.length;
      const meanRight = rightIndices.reduce((sum, idx) => sum + residuals[idx], 0) / rightIndices.length;

      let mse = 0;
      leftIndices.forEach(idx => { mse += Math.pow(residuals[idx] - meanLeft, 2); });
      rightIndices.forEach(idx => { mse += Math.pow(residuals[idx] - meanRight, 2); });

      if (mse < bestMSE) {
        bestMSE = mse;
        bestFeatureVal = splitVal;
        leftVal = meanLeft;
        rightVal = meanRight;
      }
    }

    const tree = { split: bestFeatureVal, left: leftVal, right: rightVal };
    trees.push(tree);

    for (let i = 0; i < M; i++) {
      const prediction = X[i] <= tree.split ? tree.left : tree.right;
      F[i] += learningRate * prediction;
    }
  }

  return X_pred.map(x => {
    let predVal = meanY;
    trees.forEach(tree => {
      const stepVal = x <= tree.split ? tree.left : tree.right;
      predVal += learningRate * stepVal;
    });
    return predVal;
  });
}

// Simple Naïve Bayes stub (regression using mean of Y)
function fitNaiveBayes(X, Y, X_pred) {
  const meanY = Y.reduce((s, v) => s + v, 0) / Y.length;
  return X_pred.map(() => meanY);
}

// Simple Logistic Regression stub (linear regression with sigmoid activation)
function fitLogisticRegression(X, Y, X_pred) {
  // Fit a simple linear model y = a*x + b using least squares
  const n = X.length;
  const sumX = X.reduce((s, v) => s + v, 0);
  const sumY = Y.reduce((s, v) => s + v, 0);
  const sumXY = X.reduce((s, v, i) => s + v * Y[i], 0);
  const sumXX = X.reduce((s, v) => s + v * v, 0);
  const denominator = n * sumXX - sumX * sumX || 1;
  const a = (n * sumXY - sumX * sumY) / denominator;
  const b = (sumY - a * sumX) / n;
  // Apply sigmoid to keep outputs in a reasonable range
  const sigmoid = (z) => 1 / (1 + Math.exp(-z));
  const yMin = Math.min(...Y);
  const yMax = Math.max(...Y);
  return X_pred.map(x => {
    const linear = a * x + b;
    const s = sigmoid(linear);
    // Scale back to original Y range
    return yMin + s * (yMax - yMin);
  });
}

// Simple K-Nearest Neighbors stub (k=3, distance based on index difference)
function fitKNN(X, Y, X_pred) {
  const k = 3;
  return X_pred.map(xIdx => {
    // Find distances to all training X indexes
    const distances = X.map((xVal, i) => ({ idx: i, dist: Math.abs(xIdx - X[i]) }));
    distances.sort((a, b) => a.dist - b.dist);
    const neighbors = distances.slice(0, k);
    const avg = neighbors.reduce((s, n) => s + Y[n.idx], 0) / k;
    return avg;
  });
}

// Helper: Mean Absolute Error
function mae(trueVals, predVals) {
  const n = trueVals.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += Math.abs(trueVals[i] - predVals[i]);
  }
  return sum / n;
}

// Generate business days skipping weekends
const getNextBusinessDays = (startDateStr, count) => {
  const dates = [startDateStr];
  let currentDate = new Date(startDateStr);
  
  while (dates.length <= count) {
    currentDate.setDate(currentDate.getDate() + 1);
    const day = currentDate.getDay();
    if (day !== 0 && day !== 6) { // Skip Sunday (0) and Saturday (6)
      const dateString = currentDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      dates.push(dateString);
    }
  }
  return dates;
};

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'dahamkom.xlsx');
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet);

    if (!rawData || rawData.length === 0) {
      return NextResponse.json({ error: 'No data found in excel' }, { status: 404 });
    }

    // Clean keys
    const cleanKey = (key) => key.trim().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');

    const cleanedData = rawData.map(row => {
      const cleanedRow = {};
      Object.keys(row).forEach(key => {
        cleanedRow[cleanKey(key)] = row[key];
      });

      const date = cleanedRow['Date'] ? cleanedRow['Date'].toString().trim() : '';
      
      const parseNumber = (val) => {
        if (val === undefined || val === null || val === '-') return 0;
        const cleanVal = val.toString().replace(/,/g, '').trim();
        const num = parseFloat(cleanVal);
        return isNaN(num) ? 0 : num;
      };

      const open = parseNumber(cleanedRow['Open']);
      const high = parseNumber(cleanedRow['High']);
      const low = parseNumber(cleanedRow['Low']);
      const close = parseNumber(cleanedRow['Close']);
      const adjClose = parseNumber(cleanedRow['Adj Close']);
      const volume = parseNumber(cleanedRow['Volume']);

      return {
        date,
        open,
        high,
        low,
        close,
        adjClose,
        volume
      };
    });

    // Reverse to chronological order (oldest first)
    cleanedData.reverse();

    // Calculate MA7, MA30, priceChange, priceChangePercent, and Trend for each row
    cleanedData.forEach((d, i) => {
      // MA7
      let sum7 = 0;
      let count7 = 0;
      for (let j = Math.max(0, i - 6); j <= i; j++) {
        sum7 += cleanedData[j].close;
        count7++;
      }
      d.ma7 = Math.round((sum7 / count7) * 100) / 100;

      // MA30
      let sum30 = 0;
      let count30 = 0;
      for (let j = Math.max(0, i - 29); j <= i; j++) {
        sum30 += cleanedData[j].close;
        count30++;
      }
      d.ma30 = Math.round((sum30 / count30) * 100) / 100;

      // Daily Price Change & Trend
      if (i > 0) {
        d.priceChange = Math.round((d.close - cleanedData[i - 1].close) * 100) / 100;
        d.priceChangePercent = Math.round(((d.priceChange / cleanedData[i - 1].close) * 100) * 100) / 100;
        d.trend = d.priceChange > 0 ? "Naik" : d.priceChange < 0 ? "Turun" : "Flat";
      } else {
        d.priceChange = 0;
        d.priceChangePercent = 0;
        d.trend = "Flat";
      }
    });

    const totalRecords = cleanedData.length;
    const latestIndex = totalRecords - 1;
    const latestData = cleanedData[latestIndex];
    const previousData = totalRecords > 1 ? cleanedData[latestIndex - 1] : latestData;

    const currentPrice = latestData.close;
    const previousClose = previousData.close;
    const priceChange = currentPrice - previousClose;
    const percentChange = (priceChange / previousClose) * 100;

    const dayOpen = latestData.open || currentPrice;
    const dayVolume = latestData.volume || 0;

    // 52 Week High and Low
    let minClose = Infinity;
    let maxClose = -Infinity;
    let sumVolume = 0;
    let volumeCount = 0;

    cleanedData.forEach(d => {
      if (d.close < minClose) minClose = d.close;
      if (d.close > maxClose) maxClose = d.close;
      if (d.volume > 0) {
        sumVolume += d.volume;
        volumeCount++;
      }
    });

    const avgVolume = volumeCount > 0 ? Math.round(sumVolume / volumeCount) : 0;

    // DW Baseline configurations
    const janInitialPrice = 2780; // Baseline as shown on dashboard slide
    const totalGain = currentPrice - janInitialPrice;
    const pctTotalReturn = (totalGain / janInitialPrice) * 100;

    const sharesOutstanding = 99062216600; 
    const marketCap = currentPrice * sharesOutstanding;
    const beta = 0.73; 
    const peRatio = 12.35; 
    const eps = 252.63; 
    const divYield = "186.47 (5.98%)"; 
    const exDivDate = "Jun 14, 2026";
    const targetEst = 3850.00;

    const keyStats = {
      previousClose,
      open: dayOpen,
      dayRange: `${latestData.low.toLocaleString('id-ID')} - ${latestData.high.toLocaleString('id-ID')}`,
      dayLow: latestData.low,
      dayHigh: latestData.high,
      fiftyTwoWeekRange: `${minClose.toLocaleString('id-ID')} - ${maxClose.toLocaleString('id-ID')}`,
      fiftyTwoWeekLow: minClose,
      fiftyTwoWeekHigh: maxClose,
      volume: dayVolume,
      avgVolume,
      marketCap,
      beta,
      peRatio,
      eps,
      divYield,
      exDivDate,
      targetEst,
      janInitialPrice,
      totalGain,
      pctTotalReturn
    };

    // 2. Monthly aggregates
    const monthlyGroups = {};
    cleanedData.forEach(d => {
      let yearMonth = '';
      let monthName = '';
      try {
        const parsedDate = new Date(d.date);
        if (!isNaN(parsedDate.getTime())) {
          const year = parsedDate.getFullYear();
          const monthIndex = parsedDate.getMonth();
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          monthName = months[monthIndex] + ' ' + year;
          yearMonth = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}`;
        } else {
          const parts = d.date.replace(/,/g, '').split(' ');
          if (parts.length === 3) {
            monthName = `${parts[0].substring(0, 3)} ${parts[2]}`;
            yearMonth = `${parts[2]}-${parts[0]}`;
          } else {
            monthName = d.date;
            yearMonth = d.date;
          }
        }
      } catch (e) {
        monthName = d.date;
        yearMonth = d.date;
      }

      if (!monthlyGroups[yearMonth]) {
        monthlyGroups[yearMonth] = {
          key: yearMonth,
          name: monthName,
          closeSum: 0,
          volumeSum: 0,
          count: 0
        };
      }

      monthlyGroups[yearMonth].closeSum += d.close;
      monthlyGroups[yearMonth].volumeSum += d.volume;
      monthlyGroups[yearMonth].count += 1;
    });

    const monthlyData = Object.keys(monthlyGroups)
      .sort()
      .map(key => {
        const group = monthlyGroups[key];
        return {
          month: group.name,
          avgClose: Math.round((group.closeSum / group.count) * 100) / 100,
          totalVolume: group.volumeSum
        };
      });

    // 3. Train ML Models on last 40 days
    const lastNDays = cleanedData.slice(-40);
    const X = lastNDays.map((_, i) => i);
    const Y = lastNDays.map(d => d.close);

    // Predict X_pred (indexes 39 to 44, matching date string mapping)
    const X_pred = [39, 40, 41, 42, 43, 44];
    const predDates = getNextBusinessDays(latestData.date, 5);

    const svmPredictions = fitSVR(X, Y, X_pred);
    const mlpPredictions = fitMLP(X, Y, X_pred);
    const xgbPredictions = fitXGBoost(X, Y, X_pred);
    const nbPredictions = fitNaiveBayes(X, Y, X_pred);
    const lrPredictions = fitLogisticRegression(X, Y, X_pred);
    const knnPredictions = fitKNN(X, Y, X_pred);

    // Calculate Metrics on Training Data
    const modelMetrics = {
        svm: mae(Y, fitSVR(X, Y, X)),
        mlp: mae(Y, fitMLP(X, Y, X)),
        xgboost: mae(Y, fitXGBoost(X, Y, X)),
        naiveBayes: mae(Y, fitNaiveBayes(X, Y, X)),
        logisticRegression: mae(Y, fitLogisticRegression(X, Y, X)),
        knn: mae(Y, fitKNN(X, Y, X))
    };

    const forecasts = predDates.map((date, idx) => ({
      date,
      svm: Math.round(svmPredictions[idx] * 100) / 100,
      mlp: Math.round(mlpPredictions[idx] * 100) / 100,
      xgboost: Math.round(xgbPredictions[idx] * 100) / 100,
      naiveBayes: Math.round(nbPredictions[idx] * 100) / 100,
      logisticRegression: Math.round(lrPredictions[idx] * 100) / 100,
      knn: Math.round(knnPredictions[idx] * 100) / 100
    }));

    const warehouseMetadata = {
      sourceFile: 'dahamkom.xlsx',
      recordCount: totalRecords,
      lastEtlTime: new Date().toLocaleString('id-ID'),
      status: 'SUCCESS',
      schema: 'TLKM_Stock_Dimension'
    };

    return NextResponse.json({
      history: cleanedData,
      keyStats,
      monthlyData,
      predictions: forecasts,
      modelMetrics,
      warehouseMetadata
    });

  } catch (error) {
    console.error('Error fetching/parsing stock data:', error);
    return NextResponse.json({ error: 'Failed to process stock data: ' + error.message }, { status: 500 });
  }
}
