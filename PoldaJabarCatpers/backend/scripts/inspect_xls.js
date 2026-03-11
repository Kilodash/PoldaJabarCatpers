const xlsx = require('xlsx');

const wb = xlsx.readFile('./uploads/Personel_Bermasalah_PoldaJabar_04_Maret_2026.xls');
const sheetName = wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];

const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
console.log(data.slice(0, 5));
