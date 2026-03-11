import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

export const exportPersonelPDF = (personel) => {
    const doc = jsPDF();

    // Header
    doc.setFontSize(14);
    doc.text('KEPOLISIAN NEGARA REPUBLIK INDONESIA', 20, 20);
    doc.text('DAERAH JAWA BARAT', 20, 27);
    doc.line(20, 30, 200, 30);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CATATAN PERSONEL (CATPERS)', 105, 45, { align: 'center' });

    // Data Dasar
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    let y = 60;
    const drawRow = (label, value) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 20, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`: ${value || '-'}`, 70, y);
        y += 8;
    };

    drawRow('NRP / NIP', personel.nrpNip);
    drawRow('Nama Lengkap', personel.namaLengkap);
    drawRow('Pangkat', personel.pangkat);
    drawRow('Jabatan', personel.jabatan);
    drawRow('Satuan Kerja', personel.satker?.nama || '-');
    drawRow('Status Keaktifan', personel.statusKeaktifan);

    y += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RIWAYAT PELANGGARAN / CATATAN ADMINISTRATIF', 20, y);
    y += 5;

    // Table Pelanggaran
    const tableData = (personel.pelanggaran || []).map((pel, index) => [
        index + 1,
        format(new Date(pel.tanggalSurat), 'dd/MM/yyyy'),
        pel.wujudPerbuatan,
        pel.statusPenyelesaian.replace(/_/g, ' '),
        pel.hukuman || '-'
    ]);

    doc.autoTable({
        startY: y,
        head: [['No', 'Tanggal', 'Wujud Perbuatan', 'Status', 'Hukuman']],
        body: tableData.length > 0 ? tableData : [['-', '-', 'Tidak ada catatan pelanggaran.', '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [11, 36, 71] }, // Police Blue Header
        margin: { left: 20, right: 20 }
    });

    // Footer
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, 280);
    doc.text(`Halaman 1 / 1`, 180, 280);

    // Save
    doc.save(`CATPERS_${personel.nrpNip}_${personel.namaLengkap}.pdf`);
};
