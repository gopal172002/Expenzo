import ChevronRight from "@mui/icons-material/ChevronRight";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import {
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useCallback, useMemo } from "react";
import { Link as RouterLink, useLocation, useSearchParams } from "react-router-dom";
import type { Transaction } from "../../types";
import { inr, statusLabel } from "../../utils/labels";
import { AdminStatusChip } from "../admin/AdminStatusChip";
import { ReceiptImage } from "./ReceiptImage";

type Path = {
  department?: string;
  category?: string;
  employeeId?: string;
};

function pathFromSearch(params: URLSearchParams): Path {
  return {
    department: params.get("dept") || undefined,
    category: params.get("cat") || undefined,
    employeeId: params.get("emp") || undefined,
  };
}

function applyPathToSearch(prev: URLSearchParams, next: Path): URLSearchParams {
  const params = new URLSearchParams(prev);
  if (next.department) params.set("dept", next.department);
  else params.delete("dept");
  if (next.category) params.set("cat", next.category);
  else params.delete("cat");
  if (next.employeeId) params.set("emp", next.employeeId);
  else params.delete("emp");
  return params;
}

function groupCount(items: Transaction[]) {
  const amount = items.reduce((sum, tx) => sum + tx.amount, 0);
  return { count: items.length, amount };
}

function FolderCard({
  title,
  subtitle,
  count,
  amount,
  onOpen,
}: {
  title: string;
  subtitle: string;
  count: number;
  amount: number;
  onOpen: () => void;
}) {
  return (
    <Card>
      <CardActionArea onClick={onOpen} sx={{ height: "100%" }}>
        <CardContent>
          <Stack direction="row" spacing={1.25} alignItems="flex-start">
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: "#EEF2FF",
                color: "#2563EB",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <FolderOutlined fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography fontWeight={600} noWrap>
                {title}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {subtitle}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                <Typography variant="body2" fontWeight={600}>
                  {inr(amount)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {count} {count === 1 ? "receipt" : "receipts"}
                </Typography>
              </Stack>
            </Box>
            <ChevronRight fontSize="small" sx={{ color: "text.secondary", mt: 0.5 }} />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function ReceiptExplorer({
  transactions,
  emptyLabel,
}: {
  transactions: Transaction[];
  emptyLabel: string;
}) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const path = useMemo(() => pathFromSearch(searchParams), [searchParams]);
  const setPath = useCallback(
    (next: Path) => {
      setSearchParams((prev) => applyPathToSearch(prev, next), { replace: false });
    },
    [setSearchParams]
  );
  const returnTo = `${location.pathname}${location.search}`;

  const departments = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      const key = tx.department || "Unassigned";
      const list = map.get(key) ?? [];
      list.push(tx);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [transactions]);

  const inDepartment = useMemo(
    () =>
      path.department
        ? transactions.filter((tx) => (tx.department || "Unassigned") === path.department)
        : transactions,
    [transactions, path.department]
  );

  const categories = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of inDepartment) {
      const key = tx.category || "Uncategorised";
      const list = map.get(key) ?? [];
      list.push(tx);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [inDepartment]);

  const inCategory = useMemo(
    () =>
      path.category
        ? inDepartment.filter((tx) => (tx.category || "Uncategorised") === path.category)
        : inDepartment,
    [inDepartment, path.category]
  );

  const employees = useMemo(() => {
    const map = new Map<string, { name: string; items: Transaction[] }>();
    for (const tx of inCategory) {
      const existing = map.get(tx.employeeId) ?? { name: tx.employeeName, items: [] };
      existing.items.push(tx);
      existing.name = tx.employeeName;
      map.set(tx.employeeId, existing);
    }
    return [...map.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [inCategory]);

  const receipts = useMemo(
    () =>
      path.employeeId
        ? inCategory
            .filter((tx) => tx.employeeId === path.employeeId)
            .sort((a, b) => dayjs(b.dateTime).valueOf() - dayjs(a.dateTime).valueOf())
        : [],
    [inCategory, path.employeeId]
  );

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent>
          <Stack spacing={1} alignItems="flex-start">
            <ReceiptLongOutlined color="action" />
            <Typography color="text.secondary">{emptyLabel}</Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  const crumbs: { label: string; onClick?: () => void }[] = [
    { label: "All departments", onClick: () => setPath({}) },
  ];
  if (path.department) {
    crumbs.push({
      label: path.department,
      onClick: () => setPath({ department: path.department }),
    });
  }
  if (path.category) {
    crumbs.push({
      label: path.category,
      onClick: () => setPath({ department: path.department, category: path.category }),
    });
  }
  if (path.employeeId) {
    const name = receipts[0]?.employeeName || employees.find(([id]) => id === path.employeeId)?.[1].name;
    crumbs.push({ label: name || path.employeeId });
  }

  return (
    <Stack spacing={2}>
      <Breadcrumbs separator={<ChevronRight fontSize="small" />}>
        {crumbs.map((crumb, index) =>
          crumb.onClick && index < crumbs.length - 1 ? (
            <Link
              key={crumb.label}
              component="button"
              underline="hover"
              color="inherit"
              onClick={crumb.onClick}
              sx={{ fontSize: 13, fontWeight: 600 }}
            >
              {crumb.label}
            </Link>
          ) : (
            <Typography key={crumb.label} variant="body2" fontWeight={600}>
              {crumb.label}
            </Typography>
          )
        )}
      </Breadcrumbs>

      {!path.department ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
            gap: 1.5,
          }}
        >
          {departments.map(([dept, items]) => {
            const stats = groupCount(items);
            const cats = new Set(items.map((tx) => tx.category || "Uncategorised")).size;
            return (
              <FolderCard
                key={dept}
                title={dept}
                subtitle={`${cats} ${cats === 1 ? "category" : "categories"}`}
                count={stats.count}
                amount={stats.amount}
                onOpen={() => setPath({ department: dept })}
              />
            );
          })}
        </Box>
      ) : null}

      {path.department && !path.category ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
            gap: 1.5,
          }}
        >
          {categories.map(([category, items]) => {
            const stats = groupCount(items);
            const people = new Set(items.map((tx) => tx.employeeId)).size;
            return (
              <FolderCard
                key={category}
                title={category}
                subtitle={`${people} ${people === 1 ? "employee" : "employees"}`}
                count={stats.count}
                amount={stats.amount}
                onOpen={() => setPath({ department: path.department, category })}
              />
            );
          })}
        </Box>
      ) : null}

      {path.department && path.category && !path.employeeId ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
            gap: 1.5,
          }}
        >
          {employees.map(([id, group]) => {
            const stats = groupCount(group.items);
            return (
              <FolderCard
                key={id}
                title={group.name}
                subtitle={id}
                count={stats.count}
                amount={stats.amount}
                onOpen={() => setPath({ ...path, employeeId: id })}
              />
            );
          })}
        </Box>
      ) : null}

      {path.employeeId ? (
        <Card>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Receipt</TableCell>
                <TableCell>Merchant</TableCell>
                <TableCell>MCC</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {receipts.map((tx) => (
                <TableRow key={tx.id} hover>
                  <TableCell sx={{ width: 88 }}>
                    {tx.receiptUrl ? (
                      <Box sx={{ width: 64, height: 48, overflow: "hidden", borderRadius: 1, bgcolor: "#F3F4F6" }}>
                        <ReceiptImage url={tx.receiptUrl} alt={tx.merchantName} height={48} />
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        No image
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {tx.merchantName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {tx.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{tx.mcc || "—"}</Typography>
                  </TableCell>
                  <TableCell align="right">{inr(tx.amount)}</TableCell>
                  <TableCell>{dayjs(tx.dateTime).format("DD MMM YYYY, HH:mm")}</TableCell>
                  <TableCell>
                    <AdminStatusChip status={tx.status} label={statusLabel(tx.status)} />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      component={RouterLink}
                      to={`/admin/transaction/${tx.id}`}
                      state={{ returnTo }}
                      size="small"
                    >
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}
    </Stack>
  );
}
