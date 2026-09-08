import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import type { Transaction } from "../../types";
import { ReceiptImage } from "./ReceiptImage";

const fmt = (value: number) => `Rs.${value.toLocaleString("en-IN")}`;

function statusColor(status: Transaction["status"]) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "error" as const;
  if (status === "flagged") return "warning" as const;
  return "default" as const;
}

export interface ReceiptCardItem {
  id: string;
  receiptUrl?: string;
  employeeName: string;
  employeeId?: string;
  merchantName: string;
  amount: number;
  dateTime: string;
  status: Transaction["status"];
  category?: string;
  detailTo: string;
}

export function ReceiptCard({ item, showEmployee = true }: { item: ReceiptCardItem; showEmployee?: boolean }) {
  return (
    <Card sx={{ borderRadius: 3, height: "100%", overflow: "hidden" }}>
      <CardActionArea component={RouterLink} to={item.detailTo} sx={{ height: "100%", alignItems: "stretch" }}>
        <ReceiptImage url={item.receiptUrl} alt={`${item.merchantName} receipt`} />
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={800} noWrap>
                {item.merchantName}
              </Typography>
              {showEmployee ? (
                <Typography variant="body2" color="text.secondary" noWrap>
                  {item.employeeName}
                  {item.employeeId ? ` · ${item.employeeId}` : ""}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary" noWrap>
                  {item.category || "Expense"}
                </Typography>
              )}
            </Box>
            <Chip size="small" color={statusColor(item.status)} label={item.status} />
          </Stack>
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 1.25 }}>
            <Typography fontWeight={700}>{fmt(item.amount)}</Typography>
            <Typography variant="caption" color="text.secondary">
              {dayjs(item.dateTime).format("DD MMM YYYY")}
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function ReceiptGrid({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          md: "repeat(3, minmax(0, 1fr))",
          lg: "repeat(4, minmax(0, 1fr))",
        },
        gap: 2,
      }}
    >
      {children}
    </Box>
  );
}
