import Download from "@mui/icons-material/Download";
import AlternateEmail from "@mui/icons-material/AlternateEmail";
import { Alert, Button, Card, CardContent, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useState } from "react";
import { useAdminData } from "../../context/AdminDataContext";

const csvHeaders = [
  "employee ID",
  "name",
  "department",
  "merchant",
  "category",
  "MCC",
  "amount",
  "date",
  "UPI app",
  "UPI ref ID",
  "status",
  "admin decision",
  "decision timestamp",
];

export const AdminExportsPage = () => {
  const { filteredTransactions, recordExport, exportAudits } = useAdminData();
  const [message, setMessage] = useState("");

  const dateRangeLabel = filteredTransactions.length
    ? `${dayjs(filteredTransactions[filteredTransactions.length - 1].dateTime).format("DD MMM YYYY")} - ${dayjs(filteredTransactions[0].dateTime).format("DD MMM YYYY")}`
    : "N/A";

  const exportCsv = () => {
    if (filteredTransactions.length > 1000) {
      setTimeout(() => setMessage("Large export queued. Email download link sent to finance@allpay.in."), 1000);
      recordExport("csv", dateRangeLabel, filteredTransactions.length);
      return;
    }
    const rows = filteredTransactions.map((tx) =>
      [
        tx.employeeId,
        tx.employeeName,
        tx.department,
        tx.merchantName,
        tx.category,
        tx.mcc,
        tx.amount,
        tx.dateTime,
        tx.upiApp,
        tx.upiRefId,
        tx.status,
        tx.adminDecision || "",
        tx.adminDecisionAt || "",
      ].join(","),
    );
    const csv = [csvHeaders.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "allpay-transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
    recordExport("csv", dateRangeLabel, filteredTransactions.length);
    setMessage("CSV exported successfully.");
  };

  const exportPdf = () => {
    if (filteredTransactions.length > 1000) {
      setTimeout(() => setMessage("Large PDF export queued. Email download link sent to finance@allpay.in."), 1000);
      recordExport("pdf", dateRangeLabel, filteredTransactions.length);
      return;
    }

    const doc = new jsPDF();
    doc.text("allpay Expense Report", 14, 14);
    doc.text(`Date range: ${dateRangeLabel}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [csvHeaders],
      body: filteredTransactions.slice(0, 350).map((tx) => [
        tx.employeeId,
        tx.employeeName,
        tx.department,
        tx.merchantName,
        tx.category,
        tx.mcc,
        tx.amount,
        dayjs(tx.dateTime).format("DD/MM/YYYY HH:mm"),
        tx.upiApp,
        tx.upiRefId,
        tx.status,
        tx.adminDecision || "",
        tx.adminDecisionAt ? dayjs(tx.adminDecisionAt).format("DD/MM HH:mm") : "",
      ]),
      didDrawPage: (data) => {
        doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, data.settings.margin.left, doc.internal.pageSize.height - 8);
      },
    });
    doc.save("allpay-report.pdf");
    recordExport("pdf", dateRangeLabel, filteredTransactions.length);
    setMessage("PDF exported successfully.");
  };

  return (
    <Stack spacing={2.5}>
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h5">
            Exports
          </Typography>
          <Typography color="text.secondary">
            Downloads follow the filters set on Transactions. Large files are queued.
          </Typography>
          <Stack direction="row" spacing={1} mt={2}>
            <Button variant="contained" startIcon={<Download />} onClick={exportCsv}>
              Export CSV
            </Button>
            <Button variant="outlined" startIcon={<Download />} onClick={exportPdf}>
              Export PDF
            </Button>
            <Button variant="text" startIcon={<AlternateEmail />}>
              Send to accounting
            </Button>
          </Stack>
          {message && <Alert sx={{ mt: 1.2 }}>{message}</Alert>}
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700}>
            Export audit log
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Actor</TableCell>
                <TableCell>Format</TableCell>
                <TableCell>Date range</TableCell>
                <TableCell>Records</TableCell>
                <TableCell>Exported at</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {exportAudits.map((audit) => (
                <TableRow key={audit.id}>
                  <TableCell>{audit.actor}</TableCell>
                  <TableCell>{audit.format.toUpperCase()}</TableCell>
                  <TableCell>{audit.dateRange}</TableCell>
                  <TableCell>{audit.recordCount}</TableCell>
                  <TableCell>{dayjs(audit.exportedAt).format("DD MMM YYYY HH:mm")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );
};
