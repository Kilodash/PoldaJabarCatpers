const parseManualInputTest = (inputString) => {
    const lines = inputString.split('\n');
    const results = [];

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // Coba ekstrak 18 digit terlebih dahulu, mengabaikan non-digit di antaranya
        // Jika tidak bisa, coba ekstrak 8 digit di awal.

        let nrpNip = '';
        let extractedName = '';

        // Kita hitung jumlah digit di line.
        let digitsOnly = line.replace(/\D/g, '');

        if (digitsOnly.length >= 18) {
            // Jika ada minimal 18 digit, potong tepat 18 karakter angka pertama
            nrpNip = digitsOnly.substring(0, 18);

            // Cari index asli dari digit ke-18 untuk memisahkan nama
            let digitCount = 0;
            let lastDigitIndex = 0;
            for (let i = 0; i < line.length; i++) {
                if (/\d/.test(line[i])) {
                    digitCount++;
                    if (digitCount === 18) {
                        lastDigitIndex = i;
                        break;
                    }
                }
            }
            extractedName = line.substring(lastDigitIndex + 1).replace(/^[,|\-\s]+/, '').trim();
        } else if (digitsOnly.length >= 8) {
            // Ambil 8 baris pertama
            nrpNip = digitsOnly.substring(0, 8);

            let digitCount = 0;
            let lastDigitIndex = 0;
            for (let i = 0; i < line.length; i++) {
                if (/\d/.test(line[i])) {
                    digitCount++;
                    if (digitCount === 8) {
                        lastDigitIndex = i;
                        break;
                    }
                }
            }
            extractedName = line.substring(lastDigitIndex + 1).replace(/^[,|\-\s]+/, '').trim();
        }

        if (nrpNip) {
            results.push({
                nrpNip: nrpNip,
                inputName: extractedName
            });
        }
    }
    return results;
};

const input1 = "19950520\t+ input nama 2022031001";
const input2 = "12345678, Budi Santoso";
const input3 = "19850101 200501 1 002    Rini";

console.log(parseManualInputTest(input1));
console.log(parseManualInputTest(input2));
console.log(parseManualInputTest(input3));

