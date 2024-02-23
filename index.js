const fs = require('fs');
const path = require('path');

function processDirectory(directoryPath, fileExtension, callback) {
  const fileResults = [];

  const files = fs.readdirSync(directoryPath);
  files.forEach(file => {
    const filePath = path.join(directoryPath, file);

    if (fs.statSync(filePath).isDirectory()) {
      fileResults.push(...processDirectory(filePath, fileExtension, callback)); 
    } else if (path.extname(filePath) === fileExtension) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const lines = fileContent.split('\n');
      lines.forEach(line => callback(filePath, line, fileResults));
    }
  });

  return fileResults;
}

function processLine(filePath, line, fileResults) {
  let currentFunction = fileResults[fileResults.length - 1] ?? {};
  let cleanLine = line.trim().replaceAll(" ","").replaceAll('"','');
  if(line.trim().startsWith('/')) return; 

  const functionNameRegex = /FunctionName\((.*?)\)/;
  const routeRegex = /Route=(.*?)\)/;

  if (functionNameRegex.test(cleanLine)) {
    const [, functionName] = cleanLine.match(functionNameRegex);
    currentFunction = { filePath, functionName };
    fileResults.push(currentFunction);
  } else {
    if (cleanLine.startsWith("[HttpTrigger(AuthorizationLevel")) {
      currentFunction.httpTrigger = cleanLine.split(",")[1];
    }
    if (routeRegex.test(cleanLine)) {
      const [_, route] = cleanLine.match(routeRegex);
      currentFunction.route = route; 
    }
  }
}

const startDirectory = './';
const results = processDirectory(startDirectory, ".cs", processLine);
const resultsJSON = JSON.stringify(results, null, 2);
const outputJsonFile = 'results.json'; 

fs.writeFileSync(outputJsonFile, resultsJSON, 'utf-8'); 
console.log('JSON results saved to:', outputJsonFile);

const jsonData = JSON.parse(fs.readFileSync(outputJsonFile, 'utf-8'));

function convertToCSV(data) {
  const header = 'filePath,httpTrigger,functionName,route\n';
  const rows = data.map(item => 
    `${item.filePath},${item.httpTrigger},${item.functionName},${item.route}`
  );

  return header + rows.join('\n');
}

const csvData = convertToCSV(jsonData);
const outputCsvFile = 'output.csv';
fs.writeFileSync(outputCsvFile, csvData, 'utf-8');
console.log('CSV file created:', outputCsvFile);