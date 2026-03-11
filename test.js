const text = `1. KOMPOL CANDRA KIRANA PUTRA, S.I.K., S.H., M.Si., CPHR. NRP 87041658 KASUBBIDPAMINAL
2. KOMPOL HENRI SINAGA, S.H. NRP 68120435
KAURBINPAM SUBBIDPAMINAL
3.  IPDA DELTA SAEFUL ANWAR NRP 87081518
PAMA URBINPAM SUBBIDPAMINAL
4. AIPTU RONALD NABABAN, S.H. NRP 82121030
BA URBINPAM SUBBIDPAMINAL
5. BRIPTU CAHYO TRI YUDANTHO, S.H., M.H NRP 98030426
BA URBINPAM SUBBIDPAMINAL
6.  BRIPTU ASCRI CHANDRA PRATIWI, S.H NRP 99090248
BA URBINPAM SUBBIDPAMINAL`;

const regex1 = /\b(\d{8}|\d{18})\b/g;
let matches1 = [];
let match1;
while ((match1 = regex1.exec(text)) !== null) {
    matches1.push(match1[1]);
}
console.log("Regex 1 (\\b):", matches1);

const regex2 = /(?<!\d)(\d{8}|\d{18})(?!\d)/g;
let matches2 = [];
let match2;
while ((match2 = regex2.exec(text)) !== null) {
    matches2.push(match2[1]);
}
console.log("Regex 2 (lookaround):", matches2);
