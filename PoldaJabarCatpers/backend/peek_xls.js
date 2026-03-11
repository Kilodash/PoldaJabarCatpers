const xlsx = require('xlsx');
try {
    const wb = xlsx.readFile('c:\\Users\\ACER\\OneDrive\\PoldaJabarCatpers\\PoldaJabarCatpers\\backend\\uploads\\Personel_Bermasalah_PoldaJabar_04_Maret_2026.xls');
    const sheetName = wb.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { raw: false, header: 1 });
    console.log("HEADERS:");
    console.log(JSON.stringify(data[3], null, 2));
    console.log("FIRST DATA:");
    console.log(JSON.stringify(data[4], null, 2));
} catch (e) {
    console.error(e);
}
