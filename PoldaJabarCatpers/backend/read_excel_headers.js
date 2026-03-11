const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'c:\\Users\\ACER\\OneDrive\\PoldaJabarCatpers\\PoldaJabarCatpers\\backend\\uploads\\Personel_Bermasalah_PoldaJabar_10_Maret_2026.xls';
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });

const output = {
    totalRows: data.length,
    firstRows: data.slice(0, 15)
};

fs.writeFileSync('excel_sample.json', JSON.stringify(output, null, 2));
console.log("Saved to excel_sample.json");
